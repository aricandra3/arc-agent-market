const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating task with:", deployer.address);

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const TASK_ESCROW = "0x0E2869e0C1863C094a84D4fa0d2928e19D3Fc6b9";

  const USDC = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
  const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
  const escrow = TaskEscrow.attach(TASK_ESCROW);

  // Check USDC balance
  const balance = await USDC.balanceOf(deployer.address);
  console.log("USDC Balance:", hre.ethers.formatUnits(balance, 6));

  if (balance < hre.ethers.parseUnits("10", 6)) {
    console.log("Insufficient USDC! Need at least 10 USDC.");
    console.log("Get testnet USDC from: https://faucet.circle.com");
    return;
  }

  // Approve USDC spending
  console.log("\n--- Approving USDC ---");
  const approveTx = await USDC.approve(TASK_ESCROW, hre.ethers.parseUnits("10", 6));
  await approveTx.wait();
  console.log("Approved!");

  // Create task
  console.log("\n--- Creating Task ---");
  const deadline = Math.floor(Date.now() / 1000) + 3 * 86400; // 3 days from now
  
  const tx = await escrow.createTask(
    "0x0000000000000000000000000000000000000000", // open task (no specific provider)
    hre.ethers.parseUnits("5", 6),                // 5 USDC budget
    "Build a landing page for Arc Agent Market",  // description
    ["web-dev", "frontend", "design"],            // required skills
    deadline
  );

  console.log("TX sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  // Get task count
  const taskCount = await escrow.getTaskCount();
  console.log("\n--- Task Created ---");
  console.log("Task ID:", taskCount.toString());

  // Get task details
  const task = await escrow.getTask(taskCount);
  console.log("Requester:", task[0]);
  console.log("Provider:", task[1] === "0x0000000000000000000000000000000000000000" ? "Open" : task[1]);
  console.log("Budget:", hre.ethers.formatUnits(task[2], 6), "USDC");
  console.log("Description:", task[3]);
  console.log("Status:", ["Open", "Accepted", "InProgress", "Submitted", "Approved", "Paid", "Disputed", "Resolved", "Cancelled", "Expired"][task[4]]);
  console.log("Deadline:", new Date(Number(task[6]) * 1000).toLocaleString());

  console.log("\nView on explorer:");
  console.log("https://testnet.arcscan.app/tx/" + tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
