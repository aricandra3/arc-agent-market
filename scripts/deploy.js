const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

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

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY (Arc Testnet)");
  console.log("========================================");
  console.log(`AgentRegistry: ${registryAddr}`);
  console.log(`TaskEscrow:    ${escrowAddr}`);
  console.log(`MicroPayment:  ${microPayAddr}`);
  console.log(`Reputation:    ${reputationAddr}`);
  console.log(`USDC:          ${USDC_ADDRESS}`);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
