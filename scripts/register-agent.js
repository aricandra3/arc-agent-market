const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Registering agent with:", deployer.address);

  const AGENT_REGISTRY = "0x92daC612422aA424608e02c1723075163EFb3C90";

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(AGENT_REGISTRY);

  // Check if already registered
  const isReg = await registry.isRegistered(deployer.address);
  if (isReg) {
    console.log("Already registered!");
    const agent = await registry.getAgent(deployer.address);
    console.log("Agent name:", agent[0]);
    return;
  }

  // Register agent
  const tx = await registry.registerAgent(
    "Arc Test Agent",                           // name
    "AI agent for testing Arc Agent Market",     // description
    ["web-dev", "blockchain", "testing"],        // skills
    hre.ethers.parseUnits("5", 6),               // ratePerTask: 5 USDC
    hre.ethers.parseUnits("0.01", 6),            // ratePerCall: 0.01 USDC
    ""                                           // metadataURI
  );

  console.log("Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);
  console.log("Agent registered successfully!");

  // Verify
  const agent = await registry.getAgent(deployer.address);
  console.log("\n--- Agent Profile ---");
  console.log("Name:", agent[0]);
  console.log("Description:", agent[1]);
  console.log("Skills:", agent[2]);
  console.log("Rate/Task:", hre.ethers.formatUnits(agent[3], 6), "USDC");
  console.log("Rate/Call:", hre.ethers.formatUnits(agent[4], 6), "USDC");
  console.log("Active:", agent[9]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
