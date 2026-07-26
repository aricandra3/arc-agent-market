const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys the full protocol and wires registry write permissions.
 * Exported so local dev/seed scripts reuse the exact production sequence.
 */
async function deployAll(USDC_ADDRESS) {
  // 1. Deploy AgentRegistry
  console.log("\n--- Deploying AgentRegistry ---");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("AgentRegistry:", registryAddr);

  // 2. Deploy TaskEscrow
  console.log("\n--- Deploying TaskEscrow ---");
  const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
  const escrow = await TaskEscrow.deploy(USDC_ADDRESS, registryAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("TaskEscrow:", escrowAddr);

  // 3. Deploy MicroPayment
  console.log("\n--- Deploying MicroPayment ---");
  const MicroPayment = await hre.ethers.getContractFactory("MicroPayment");
  const microPay = await MicroPayment.deploy(USDC_ADDRESS);
  await microPay.waitForDeployment();
  const microPayAddr = await microPay.getAddress();
  console.log("MicroPayment:", microPayAddr);

  // 4. Deploy Reputation
  console.log("\n--- Deploying Reputation ---");
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(escrowAddr, registryAddr);
  await reputation.waitForDeployment();
  const reputationAddr = await reputation.getAddress();
  console.log("Reputation:", reputationAddr);

  // 5. Deploy VerifierRegistry
  console.log("\n--- Deploying VerifierRegistry ---");
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const verifierRegistry = await VerifierRegistry.deploy();
  await verifierRegistry.waitForDeployment();
  const verifierRegistryAddr = await verifierRegistry.getAddress();
  console.log("VerifierRegistry:", verifierRegistryAddr);

  // 6. Deploy WorkReceipt
  console.log("\n--- Deploying WorkReceipt ---");
  const WorkReceipt = await hre.ethers.getContractFactory("WorkReceipt");
  const workReceipt = await WorkReceipt.deploy(escrowAddr, verifierRegistryAddr);
  await workReceipt.waitForDeployment();
  const workReceiptAddr = await workReceipt.getAddress();
  console.log("WorkReceipt:", workReceiptAddr);

  // 7. Wire permissions.
  //    Without this, TaskEscrow.approveTask and Reputation.submitReview both
  //    revert on AgentRegistry's authorized-writer check.
  console.log("\n--- Authorizing registry writers ---");
  await (await registry.setAuthorizedWriter(escrowAddr, true)).wait();
  console.log("AgentRegistry: authorized TaskEscrow");
  await (await registry.setAuthorizedWriter(reputationAddr, true)).wait();
  console.log("AgentRegistry: authorized Reputation");

  if (
    !(await registry.authorizedWriters(escrowAddr)) ||
    !(await registry.authorizedWriters(reputationAddr))
  ) {
    throw new Error("Registry writer authorization failed — aborting");
  }

  return {
    registry,
    escrow,
    microPay,
    reputation,
    verifierRegistry,
    workReceipt,
    addresses: {
      AgentRegistry: registryAddr,
      TaskEscrow: escrowAddr,
      MicroPayment: microPayAddr,
      Reputation: reputationAddr,
      VerifierRegistry: verifierRegistryAddr,
      WorkReceipt: workReceiptAddr,
      USDC: USDC_ADDRESS,
    },
  };
}

/**
 * Well-known keys that must never reach a public network. These are published
 * in Hardhat's and Foundry's docs, so anyone can spend from them.
 */
const PUBLIC_TEST_ADDRESSES = new Set(
  [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  ].map((address) => address.toLowerCase()),
);

const LOCAL_NETWORKS = new Set(["hardhat", "localhost"]);

/**
 * Validates OWNER_ADDRESS without touching the network.
 *
 * This runs in preflight, before any gas is spent: a deployment that aborts
 * after the contracts are live wastes gas and — worse — loses the addresses,
 * since the deployment record is written at the end.
 */
function resolveOwnerAddress(deployerAddress) {
  const raw = process.env.OWNER_ADDRESS?.trim();
  if (!raw) return null;

  if (!hre.ethers.isAddress(raw)) {
    // A 32-byte value here is almost always a private key or a tx hash pasted
    // by mistake. Never echo it back — if it is a key, printing burns it.
    const hint = /^0x[0-9a-fA-F]{64}$/.test(raw)
      ? " The value looks like a 32-byte private key or hash, not a 20-byte " +
        "address. OWNER_ADDRESS takes an address (0x + 40 hex). If you pasted " +
        "a private key, treat it as compromised and stop using it."
      : " Expected an address: 0x + 40 hex characters.";
    throw new Error(`OWNER_ADDRESS is not a valid address.${hint}`);
  }

  if (raw.toLowerCase() === deployerAddress.toLowerCase()) {
    throw new Error(
      "OWNER_ADDRESS equals the deployer — that defeats the point. Use a separate key.",
    );
  }

  return hre.ethers.getAddress(raw);
}

async function preflight() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in .env before deploying.",
    );
  }

  const [deployer] = signers;
  const isLocal = LOCAL_NETWORKS.has(hre.network.name);

  // Validated first: cheapest possible failure.
  const ownerAddress = resolveOwnerAddress(deployer.address);

  if (!isLocal && PUBLIC_TEST_ADDRESSES.has(deployer.address.toLowerCase())) {
    throw new Error(
      `Refusing to deploy: ${deployer.address} is a publicly published test key. ` +
        "Anyone can spend from it and seize the contracts. Use a fresh key.",
    );
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (!isLocal && balance === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has a zero balance — fund it before deploying.`,
    );
  }

  console.log("Deployer:", deployer.address);
  // Printed raw: Arc's native-decimals configuration is inconsistent across
  // its docs, so a formatted figure here would be misleading.
  console.log("Balance (wei):", balance.toString());
  console.log(
    "Owner target:",
    ownerAddress ?? "(unset — deploy key stays owner)",
  );

  return { deployer, ownerAddress };
}

/**
 * Hands long-term control to `OWNER_ADDRESS` when set, keeping the deploy key
 * disposable. Ownable2Step means the new owner must call `acceptOwnership()`,
 * so a typo cannot brick the contracts.
 */
async function handOverOwnership(contracts, target) {
  if (!target) {
    console.log(
      "\n[!] OWNER_ADDRESS not set — the deploy key stays owner and receives all\n" +
        "    platform fees. If that key leaks, TaskEscrow.resolveDispute lets the\n" +
        "    holder split any disputed escrow. Set OWNER_ADDRESS to a cold wallet\n" +
        "    or multisig and run scripts/rotate-owner.js.",
    );
    return null;
  }

  console.log(`\n--- Handing ownership to ${target} ---`);
  for (const [name, contract] of Object.entries(contracts)) {
    await (await contract.transferOwnership(target)).wait();
    const pending = await contract.pendingOwner();
    if (pending.toLowerCase() !== target.toLowerCase()) {
      throw new Error(`${name}: ownership transfer did not register`);
    }
    console.log(`${name}: pending owner -> ${target}`);
  }

  console.log(
    `\n[!] Ownership is PENDING. From ${target}, call acceptOwnership() on each\n` +
      "    contract to finish the handover. Until then the deploy key still owns them.",
  );
  return target;
}

function writeDeploymentRecord(record) {
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);
  return path.relative(process.cwd(), outFile);
}

async function main() {
  const { deployer, ownerAddress } = await preflight();

  // Arc Testnet USDC address (native gas token)
  const USDC_ADDRESS =
    process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

  const deployment = await deployAll(USDC_ADDRESS);
  const {
    registry,
    escrow,
    microPay,
    reputation,
    verifierRegistry,
    addresses: {
      AgentRegistry: registryAddr,
      TaskEscrow: escrowAddr,
      MicroPayment: microPayAddr,
      Reputation: reputationAddr,
      VerifierRegistry: verifierRegistryAddr,
      WorkReceipt: workReceiptAddr,
    },
  } = deployment;

  const addresses = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    owner: deployer.address,
    ownershipPending: false,
    AgentRegistry: registryAddr,
    TaskEscrow: escrowAddr,
    MicroPayment: microPayAddr,
    Reputation: reputationAddr,
    VerifierRegistry: verifierRegistryAddr,
    WorkReceipt: workReceiptAddr,
    USDC: USDC_ADDRESS,
  };

  console.log("\n========================================");
  console.log(`DEPLOYMENT SUMMARY (${hre.network.name})`);
  console.log("========================================");
  console.log(`AgentRegistry:    ${registryAddr}`);
  console.log(`TaskEscrow:       ${escrowAddr}`);
  console.log(`MicroPayment:     ${microPayAddr}`);
  console.log(`Reputation:       ${reputationAddr}`);
  console.log(`VerifierRegistry: ${verifierRegistryAddr}`);
  console.log(`WorkReceipt:      ${workReceiptAddr}`);
  console.log(`USDC:             ${USDC_ADDRESS}`);
  console.log("========================================");

  // Recorded before the handover: the contracts are already live and paid for,
  // so their addresses must survive any later failure.
  console.log(`\nAddresses written to ${writeDeploymentRecord(addresses)}`);

  // WorkReceipt is intentionally absent: it has no owner.
  const pendingOwner = await handOverOwnership(
    {
      AgentRegistry: registry,
      TaskEscrow: escrow,
      MicroPayment: microPay,
      Reputation: reputation,
      VerifierRegistry: verifierRegistry,
    },
    ownerAddress,
  );

  if (pendingOwner) {
    addresses.owner = pendingOwner;
    addresses.ownershipPending = true;
    writeDeploymentRecord(addresses);
  }

  console.log("\nPaste into frontend/.env.local:");
  console.log(
    [
      `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${registryAddr}`,
      `NEXT_PUBLIC_TASK_ESCROW_ADDRESS=${escrowAddr}`,
      `NEXT_PUBLIC_MICRO_PAYMENT_ADDRESS=${microPayAddr}`,
      `NEXT_PUBLIC_REPUTATION_ADDRESS=${reputationAddr}`,
      `NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=${verifierRegistryAddr}`,
      `NEXT_PUBLIC_WORK_RECEIPT_ADDRESS=${workReceiptAddr}`,
      `NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`,
    ].join("\n"),
  );
}

module.exports = { deployAll, PUBLIC_TEST_ADDRESSES };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
