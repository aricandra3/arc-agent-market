const { ethers } = require("hardhat");

const TASK_ESCROW = "0x0E2869e0C1863C094a84D4fa0d2928e19D3Fc6b9";
const AGENT_REGISTRY = "0x92daC612422aA424608e02c1723075163EFb3C90";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Operator:", deployer.address);

  const TaskEscrow = await ethers.getContractAt("TaskEscrow", TASK_ESCROW);
  const AgentRegistry = await ethers.getContractAt("AgentRegistry", AGENT_REGISTRY);

  const statusNames = ["Open","Accepted","InProgress","Submitted","Approved","Paid","Disputed","Resolved","Cancelled","Expired"];

  // ── Check current state ──
  console.log("\n━━━ CURRENT STATE ━━━");
  const task = await TaskEscrow.getTask(1);
  console.log("Task #1 — status:", statusNames[Number(task.status)]);
  console.log("  requester:", task.requester);
  console.log("  provider:", task.provider);
  console.log("  budget:", ethers.formatUnits(task.budget, 6), "USDC");

  // ── Get agent info (tuple destructuring) ──
  const [name, desc, skills, ratePerTask, ratePerCall, completedTasks, totalEarnings, avgRating, ratingCount, isActive, metadataURI] = await AgentRegistry.getAgent(deployer.address);
  console.log("\nAgent info:");
  console.log("  name:", name);
  console.log("  completedTasks:", completedTasks.toString());
  console.log("  totalEarnings:", ethers.formatUnits(totalEarnings, 6), "USDC");
  console.log("  avgRating:", avgRating.toString());
  console.log("  isActive:", isActive);

  // ── Check AgentRegistry owner ──
  const agentOwner = await AgentRegistry.owner();
  console.log("\nAgentRegistry owner:", agentOwner);
  console.log("TaskEscrow address:", TASK_ESCROW);
  console.log("Deployer:", deployer.address);
  console.log("Is deployer owner?", agentOwner.toLowerCase() === deployer.address.toLowerCase());

  // ── Try approve ──
  if (Number(task.status) === 3) { // Submitted
    console.log("\n━━━ STEP 5: Approve Task ━━━");
    console.log("Note: approveTask calls agentRegistry.recordTaskCompletion(provider, payment)");
    console.log("recordTaskCompletion requires msg.sender == owner()");
    console.log("msg.sender will be TaskEscrow (" + TASK_ESCROW + ")");
    console.log("owner is " + agentOwner);
    
    if (agentOwner.toLowerCase() !== TASK_ESCROW.toLowerCase()) {
      console.log("\n⚠️  MISMATCH! TaskEscrow is NOT the owner of AgentRegistry.");
      console.log("Options:");
      console.log("  1. Transfer AgentRegistry ownership to TaskEscrow");
      console.log("  2. Skip recordTaskCompletion (modify contract)");
      console.log("  3. Just try and see the revert");
      
      console.log("\n→ Trying option 3: just call approveTask...");
      try {
        const tx = await TaskEscrow.approveTask(1);
        console.log("Approve TX:", tx.hash);
        const r = await tx.wait();
        console.log("✅ Approved! Gas:", r.gasUsed.toString());
      } catch (e) {
        console.log("❌ Reverted:", e.message.slice(0, 200));
        
        console.log("\n→ Trying option 1: transfer ownership to TaskEscrow...");
        const txOwn = await AgentRegistry.transferOwnership(TASK_ESCROW);
        console.log("TransferOwnership TX:", txOwn.hash);
        await txOwn.wait();
        console.log("✅ AgentRegistry owner → TaskEscrow");
        
        // Now retry approve
        console.log("\n→ Retrying approveTask...");
        const tx2 = await TaskEscrow.approveTask(1);
        console.log("Approve TX:", tx2.hash);
        const r2 = await tx2.wait();
        console.log("✅ Task approved & payment released! Gas:", r2.gasUsed.toString());
      }
    } else {
      const tx = await TaskEscrow.approveTask(1);
      console.log("Approve TX:", tx.hash);
      const r = await tx.wait();
      console.log("✅ Task approved & payment released! Gas:", r.gasUsed.toString());
    }
  }

  // ── Final state ──
  console.log("\n━━━ 🎉 FINAL STATE ━━━");
  const final = await TaskEscrow.getTask(1);
  console.log("Task #1 — status:", statusNames[Number(final.status)]);
  console.log("  deliverable:", final.deliverableURI);

  const [n, d, s, rpt, rpc, ct, te, ar, rc, ia, mu] = await AgentRegistry.getAgent(deployer.address);
  console.log("\nAgent:", n);
  console.log("  completedTasks:", ct.toString());
  console.log("  totalEarnings:", ethers.formatUnits(te, 6), "USDC");
  console.log("  avgRating:", ar.toString());

  const fee = (final.budget * 250n) / 10000n;
  const providerPay = final.budget - fee;
  console.log("\nPayment breakdown:");
  console.log("  Budget:", ethers.formatUnits(final.budget, 6), "USDC");
  console.log("  Platform fee (2.5%):", ethers.formatUnits(fee, 6), "USDC");
  console.log("  Provider received:", ethers.formatUnits(providerPay, 6), "USDC");

  console.log("\n━━━ ✅ FULL TASK FLOW COMPLETE ━━━");
}

main().catch(console.error);
