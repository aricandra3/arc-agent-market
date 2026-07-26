/**
 * Spins up a fully seeded protocol on a local Hardhat node so the frontend can
 * be exercised without spending Arc testnet quota.
 *
 *   npx hardhat node                                   # terminal 1
 *   npx hardhat run scripts/seed-local.js --network localhost
 *
 * Then copy the printed variables into frontend/.env.development.local.
 *
 * When you are done, undo it in this order:
 *
 *   rm frontend/.env.development.local
 *   rm -rf frontend/.next          # NEXT_PUBLIC_* is inlined at compile time,
 *                                  # so a stale build keeps serving localhost
 *
 * Then remove the local network from your wallet. `ensureArcChain` calls
 * `wallet_addEthereumChain`, and the wallet *persists* whatever it is given, so
 * the local chain stays in its network list until you delete it by hand.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { deployAll } = require("./deploy");

async function main() {
  const [deployer, requester, provider] = await hre.ethers.getSigners();

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC:", usdcAddr);

  const { registry, escrow, verifierRegistry, workReceipt, addresses } =
    await deployAll(usdcAddr);

  // Fund the demo accounts.
  for (const account of [deployer, requester, provider]) {
    await (
      await usdc.mint(account.address, hre.ethers.parseUnits("10000", 6))
    ).wait();
  }

  // Register two providers so the marketplace list is not empty.
  await (
    await registry
      .connect(provider)
      .registerAgent(
        "Ledger Auditor",
        "Reviews Solidity diffs and produces a signed findings report.",
        ["smart-contracts", "security", "testing"],
        hre.ethers.parseUnits("120", 6),
        hre.ethers.parseUnits("0.02", 6),
        "ipfs://agent-ledger-auditor",
      )
  ).wait();
  await (
    await registry
      .connect(deployer)
      .registerAgent(
        "Copy Forge",
        "Long-form technical writing with source citations.",
        ["copywriting", "research"],
        hre.ethers.parseUnits("40", 6),
        hre.ethers.parseUnits("0.01", 6),
        "ipfs://agent-copy-forge",
      )
  ).wait();

  const escrowAddr = addresses.TaskEscrow;
  const latest = await hre.ethers.provider.getBlock("latest");
  const deadline = BigInt(latest.timestamp + 14 * 24 * 60 * 60);

  // 1. An open task anyone registered can accept.
  const openBudget = hre.ethers.parseUnits("250", 6);
  await (await usdc.connect(requester).approve(escrowAddr, openBudget)).wait();
  await (
    await escrow
      .connect(requester)
      .createTask(
        hre.ethers.ZeroAddress,
        openBudget,
        "Audit the escrow release path and document every state transition that can lock funds.",
        ["smart-contracts", "security"],
        deadline,
      )
  ).wait();

  // 2. A directed task already assigned to the provider, ready for delivery.
  const directBudget = hre.ethers.parseUnits("120", 6);
  await (await usdc.connect(requester).approve(escrowAddr, directBudget)).wait();
  await (
    await escrow
      .connect(requester)
      .createTask(
        provider.address,
        directBudget,
        "Write the migration guide for the authorized-writer registry change.",
        ["copywriting", "research"],
        deadline,
      )
  ).wait();

  // 3. A settled task, so the review flow has something to rate.
  const settledBudget = hre.ethers.parseUnits("60", 6);
  await (await usdc.connect(requester).approve(escrowAddr, settledBudget)).wait();
  await (
    await escrow
      .connect(requester)
      .createTask(
        provider.address,
        settledBudget,
        "Ship the rate-limit fix and document the measured quota.",
        ["software"],
        deadline,
      )
  ).wait();
  const settledId = await escrow.getTaskCount();
  await (
    await escrow
      .connect(provider)
      .submitDeliverable(settledId, hre.ethers.id("settled"), "ipfs://settled")
  ).wait();
  await (await escrow.connect(requester).approveTask(settledId)).wait();

  // 4. A submitted task with a pending receipt, so the verifier queue is not empty.
  const reviewBudget = hre.ethers.parseUnits("80", 6);
  await (await usdc.connect(requester).approve(escrowAddr, reviewBudget)).wait();
  await (
    await escrow
      .connect(requester)
      .createTask(
        provider.address,
        reviewBudget,
        "Audit the verifier registry permissions.",
        ["security"],
        deadline,
      )
  ).wait();
  const pendingId = await escrow.getTaskCount();
  await (
    await escrow
      .connect(provider)
      .submitDeliverable(pendingId, hre.ethers.id("pending"), "ipfs://pending")
  ).wait();
  await (
    await workReceipt
      .connect(provider)
      .createReceipt(pendingId, "ipfs://proof-pending", hre.ethers.id("proof-pending"))
  ).wait();

  // 5. Register the deployer as an active verifier so the queue is actionable.
  await (
    await verifierRegistry.registerVerifier(
      deployer.address,
      "Local QA Service",
      1,
      ["software", "security"],
      "ipfs://verifier-local",
    )
  ).wait();

  console.log(`\nSettled task (reviewable): ${settledId}`);
  console.log(`Submitted task with pending receipt: ${pendingId}`);
  console.log(`Verifier: ${deployer.address}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${hre.network.name}.json`),
    `${JSON.stringify(
      {
        network: hre.network.name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
        rpcUrl: "http://127.0.0.1:8545",
        requester: requester.address,
        provider: provider.address,
        ...addresses,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nTasks created: ${await escrow.getTaskCount()}`);
  console.log(`Agents registered: ${await registry.getAgentCount()}`);
  console.log("\nRequester:", requester.address);
  console.log("Provider: ", provider.address);

  console.log("\nWrite to frontend/.env.development.local:");
  console.log(
    [
      "NEXT_PUBLIC_ARC_RPC_URL=http://127.0.0.1:8545",
      "NEXT_PUBLIC_ARC_CHAIN_ID=31337",
      `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${addresses.AgentRegistry}`,
      `NEXT_PUBLIC_TASK_ESCROW_ADDRESS=${addresses.TaskEscrow}`,
      `NEXT_PUBLIC_MICRO_PAYMENT_ADDRESS=${addresses.MicroPayment}`,
      `NEXT_PUBLIC_REPUTATION_ADDRESS=${addresses.Reputation}`,
      `NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=${addresses.VerifierRegistry}`,
      `NEXT_PUBLIC_WORK_RECEIPT_ADDRESS=${addresses.WorkReceipt}`,
      `NEXT_PUBLIC_USDC_ADDRESS=${usdcAddr}`,
    ].join("\n"),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
