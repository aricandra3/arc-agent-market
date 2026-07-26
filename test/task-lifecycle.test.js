const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Covers the money path: escrow → submit → approve → payout → review.
 *
 * This path was completely untested, which is how the authorization bug
 * (AgentRegistry rejecting TaskEscrow, making every approveTask revert)
 * shipped unnoticed.
 */
describe("Task lifecycle", function () {
  const TASK_STATUS_SUBMITTED = 3;
  const TASK_STATUS_PAID = 5;
  const FEE_BPS = 250n;

  async function deployFixture() {
    const [owner, requester, provider, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();

    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(
      await usdc.getAddress(),
      await agentRegistry.getAddress(),
    );
    await taskEscrow.waitForDeployment();

    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy(
      await taskEscrow.getAddress(),
      await agentRegistry.getAddress(),
    );
    await reputation.waitForDeployment();

    // Mirrors scripts/deploy.js wiring.
    await agentRegistry.setAuthorizedWriter(await taskEscrow.getAddress(), true);
    await agentRegistry.setAuthorizedWriter(await reputation.getAddress(), true);

    await agentRegistry
      .connect(provider)
      .registerAgent(
        "Build Agent",
        "Builds and verifies software tasks",
        ["software", "testing"],
        ethers.parseUnits("25", 6),
        ethers.parseUnits("0.01", 6),
        "ipfs://agent-passport",
      );

    await usdc.mint(requester.address, ethers.parseUnits("1000", 6));

    return {
      owner,
      requester,
      provider,
      other,
      usdc,
      agentRegistry,
      taskEscrow,
      reputation,
    };
  }

  async function futureDeadline(days = 7) {
    const block = await ethers.provider.getBlock("latest");
    return BigInt(block.timestamp + days * 24 * 60 * 60);
  }

  async function createTask(fixture, providerAddress) {
    const { requester, provider, usdc, taskEscrow } = fixture;
    const budget = ethers.parseUnits("50", 6);

    await usdc.connect(requester).approve(await taskEscrow.getAddress(), budget);
    await taskEscrow
      .connect(requester)
      .createTask(
        providerAddress ?? provider.address,
        budget,
        "Implement verified work receipts",
        ["software", "testing"],
        await futureDeadline(),
      );

    return { taskId: await taskEscrow.getTaskCount(), budget };
  }

  it("escrows USDC on task creation", async function () {
    const fixture = await deployFixture();
    const { usdc, taskEscrow } = fixture;
    const { budget } = await createTask(fixture);

    expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(budget);
  });

  it("pays the provider and records completion on approval", async function () {
    const fixture = await deployFixture();
    const { owner, requester, provider, usdc, agentRegistry, taskEscrow } =
      fixture;
    const { taskId, budget } = await createTask(fixture);

    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("deliverable-v1"), "ipfs://deliverable-v1");
    expect((await taskEscrow.getTask(taskId))[4]).to.equal(
      TASK_STATUS_SUBMITTED,
    );

    const fee = (budget * FEE_BPS) / 10000n;
    const payout = budget - fee;
    const ownerBefore = await usdc.balanceOf(owner.address);

    await expect(taskEscrow.connect(requester).approveTask(taskId))
      .to.emit(taskEscrow, "TaskApproved")
      .withArgs(taskId, payout);

    expect(await usdc.balanceOf(provider.address)).to.equal(payout);
    expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore + fee);
    expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(0);
    expect((await taskEscrow.getTask(taskId))[4]).to.equal(TASK_STATUS_PAID);

    const agent = await agentRegistry.getAgent(provider.address);
    expect(agent.completedTasks).to.equal(1);
    expect(agent.totalEarnings).to.equal(payout);
  });

  it("reverts approval when TaskEscrow is not an authorized registry writer", async function () {
    const fixture = await deployFixture();
    const { requester, provider, agentRegistry, taskEscrow } = fixture;
    const { taskId } = await createTask(fixture);

    await agentRegistry.setAuthorizedWriter(await taskEscrow.getAddress(), false);
    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("deliverable-v1"), "ipfs://deliverable-v1");

    await expect(
      taskEscrow.connect(requester).approveTask(taskId),
    ).to.be.revertedWith("Not authorized writer");
  });

  it("rejects registry stat writes from unauthorized callers", async function () {
    const { other, provider, agentRegistry } = await deployFixture();

    await expect(
      agentRegistry
        .connect(other)
        .recordTaskCompletion(provider.address, ethers.parseUnits("1", 6)),
    ).to.be.revertedWith("Not authorized writer");
    await expect(
      agentRegistry.connect(other).updateRating(provider.address, 5),
    ).to.be.revertedWith("Not authorized writer");
  });

  it("only lets the owner manage authorized writers", async function () {
    const { other, taskEscrow, agentRegistry } = await deployFixture();

    await expect(
      agentRegistry
        .connect(other)
        .setAuthorizedWriter(await taskEscrow.getAddress(), true),
    ).to.be.revertedWithCustomError(
      agentRegistry,
      "OwnableUnauthorizedAccount",
    );
  });

  it("lets both parties review a paid task and propagates the rating", async function () {
    const fixture = await deployFixture();
    const { requester, provider, agentRegistry, taskEscrow, reputation } =
      fixture;
    const { taskId } = await createTask(fixture);

    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("deliverable-v1"), "ipfs://deliverable-v1");
    await taskEscrow.connect(requester).approveTask(taskId);

    await expect(reputation.connect(requester).submitReview(taskId, 5, "great work"))
      .to.emit(reputation, "ReviewSubmitted")
      .withArgs(1, requester.address, provider.address, taskId, 5);
    await reputation.connect(provider).submitReview(taskId, 4, "clear brief");

    // Scaled by 100: a single 5-star review reads as 5.00.
    expect(await agentRegistry.getAverageRating(provider.address)).to.equal(500);
    expect(await reputation.getReviewCount(provider.address)).to.equal(1);
    expect(await reputation.getReviewCount(requester.address)).to.equal(1);
    expect(
      await reputation.hasReviewForTask(taskId, requester.address),
    ).to.equal(true);
  });

  it("rejects reviews before the task is paid and duplicate reviews", async function () {
    const fixture = await deployFixture();
    const { requester, provider, other, taskEscrow, reputation } = fixture;
    const { taskId } = await createTask(fixture);

    await expect(
      reputation.connect(requester).submitReview(taskId, 5, "too early"),
    ).to.be.revertedWith("Task not paid");

    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("deliverable-v1"), "ipfs://deliverable-v1");
    await taskEscrow.connect(requester).approveTask(taskId);

    await reputation.connect(requester).submitReview(taskId, 5, "great work");
    await expect(
      reputation.connect(requester).submitReview(taskId, 4, "again"),
    ).to.be.revertedWith("Already reviewed");
    await expect(
      reputation.connect(other).submitReview(taskId, 4, "not my task"),
    ).to.be.revertedWith("Not involved");
  });

  it("lets an unassigned provider accept an open task", async function () {
    const fixture = await deployFixture();
    const { provider, other, taskEscrow } = fixture;
    const { taskId } = await createTask(fixture, ethers.ZeroAddress);

    await expect(taskEscrow.connect(other).acceptTask(taskId)).to.be.revertedWith(
      "Not registered",
    );

    await expect(taskEscrow.connect(provider).acceptTask(taskId))
      .to.emit(taskEscrow, "TaskAccepted")
      .withArgs(taskId, provider.address);

    expect((await taskEscrow.getTask(taskId))[1]).to.equal(provider.address);
    expect(await taskEscrow.getProviderTasks(provider.address)).to.deep.equal([
      taskId,
    ]);
  });

  it("refunds the requester when an open task is cancelled", async function () {
    const fixture = await deployFixture();
    const { requester, usdc, taskEscrow } = fixture;
    const before = await usdc.balanceOf(requester.address);
    const { taskId, budget } = await createTask(fixture, ethers.ZeroAddress);

    await expect(taskEscrow.connect(requester).cancelTask(taskId)).to.emit(
      taskEscrow,
      "TaskCancelled",
    );
    expect(await usdc.balanceOf(requester.address)).to.equal(before);
    expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(0);
    expect(budget).to.be.greaterThan(0);
  });

  it("blocks deliverable submission from non-providers", async function () {
    const fixture = await deployFixture();
    const { other, taskEscrow } = fixture;
    const { taskId } = await createTask(fixture);

    await expect(
      other.address &&
        taskEscrow
          .connect(other)
          .submitDeliverable(taskId, ethers.id("x"), "ipfs://x"),
    ).to.be.revertedWith("Not provider");
  });
});
