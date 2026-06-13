const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Verified Agent Work", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const TASK_STATUS_SUBMITTED = 3;
  const RECEIPT_STATUS_PENDING = 1;
  const RECEIPT_STATUS_PASSED = 2;
  const RECEIPT_STATUS_FAILED = 3;

  async function deployFixture() {
    const [owner, requester, provider, verifier, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();

    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(
      await usdc.getAddress(),
      await agentRegistry.getAddress()
    );
    await taskEscrow.waitForDeployment();

    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.deploy();
    await verifierRegistry.waitForDeployment();

    const WorkReceipt = await ethers.getContractFactory("WorkReceipt");
    const workReceipt = await WorkReceipt.deploy(
      await taskEscrow.getAddress(),
      await verifierRegistry.getAddress()
    );
    await workReceipt.waitForDeployment();

    await agentRegistry
      .connect(provider)
      .registerAgent(
        "Build Agent",
        "Builds and verifies software tasks",
        ["software", "testing"],
        ethers.parseUnits("25", 6),
        ethers.parseUnits("0.01", 6),
        "ipfs://agent-passport"
      );

    await usdc.mint(requester.address, ethers.parseUnits("1000", 6));

    return {
      owner,
      requester,
      provider,
      verifier,
      other,
      usdc,
      agentRegistry,
      taskEscrow,
      verifierRegistry,
      workReceipt,
    };
  }

  async function createSubmittedTask(fixture) {
    const { requester, provider, usdc, taskEscrow } = fixture;
    const budget = ethers.parseUnits("50", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    await usdc.connect(requester).approve(await taskEscrow.getAddress(), budget);
    await taskEscrow
      .connect(requester)
      .createTask(
        provider.address,
        budget,
        "Implement verified work receipts",
        ["software", "testing"],
        deadline
      );

    const taskId = await taskEscrow.getTaskCount();
    await taskEscrow
      .connect(provider)
      .submitDeliverable(
        taskId,
        ethers.id("deliverable-v1"),
        "ipfs://deliverable-v1"
      );

    const task = await taskEscrow.getTask(taskId);
    expect(task[4]).to.equal(TASK_STATUS_SUBMITTED);

    return taskId;
  }

  async function registerVerifier(fixture) {
    const { verifier, verifierRegistry } = fixture;
    await verifierRegistry.registerVerifier(
      verifier.address,
      "Manual QA Service",
      1,
      ["software", "testing"],
      "ipfs://verifier-metadata"
    );
  }

  it("lets the owner register an active verifier", async function () {
    const fixture = await deployFixture();
    const { verifier, verifierRegistry } = fixture;

    await expect(
      verifierRegistry.registerVerifier(
        verifier.address,
        "Manual QA Service",
        1,
        ["software", "testing"],
        "ipfs://verifier-metadata"
      )
    )
      .to.emit(verifierRegistry, "VerifierRegistered")
      .withArgs(verifier.address, "Manual QA Service", 1);

    expect(await verifierRegistry.isActiveVerifier(verifier.address)).to.equal(true);
    const verifierData = await verifierRegistry.getVerifier(verifier.address);
    expect(verifierData.wallet).to.equal(verifier.address);
    expect(verifierData.name).to.equal("Manual QA Service");
    expect(verifierData.metadataURI).to.equal("ipfs://verifier-metadata");
  });

  it("rejects verifier registration from non-owner accounts", async function () {
    const fixture = await deployFixture();
    const { other, verifier, verifierRegistry } = fixture;

    await expect(
      verifierRegistry
        .connect(other)
        .registerVerifier(
          verifier.address,
          "Manual QA Service",
          1,
          ["software", "testing"],
          "ipfs://verifier-metadata"
        )
    ).to.be.revertedWithCustomError(verifierRegistry, "OwnableUnauthorizedAccount");
  });

  it("lets the task provider create one pending receipt after submission", async function () {
    const fixture = await deployFixture();
    const { provider, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);

    await expect(
      workReceipt
        .connect(provider)
        .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"))
    )
      .to.emit(workReceipt, "ReceiptCreated")
      .withArgs(1, taskId, provider.address);

    const receipt = await workReceipt.getReceipt(1);
    expect(receipt.taskId).to.equal(taskId);
    expect(receipt.provider).to.equal(provider.address);
    expect(receipt.deliverableURI).to.equal("ipfs://deliverable-v1");
    expect(receipt.proofURI).to.equal("ipfs://proof-v1");
    expect(receipt.proofHash).to.equal(ethers.id("proof-v1"));
    expect(receipt.status).to.equal(RECEIPT_STATUS_PENDING);
  });

  it("rejects receipt creation from non-provider accounts", async function () {
    const fixture = await deployFixture();
    const { other, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);

    await expect(
      workReceipt
        .connect(other)
        .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"))
    ).to.be.revertedWith("Only task provider");
  });

  it("rejects receipt creation before the task is submitted", async function () {
    const fixture = await deployFixture();
    const { requester, provider, usdc, taskEscrow, workReceipt } = fixture;
    const budget = ethers.parseUnits("50", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    await usdc.connect(requester).approve(await taskEscrow.getAddress(), budget);
    await taskEscrow
      .connect(requester)
      .createTask(
        provider.address,
        budget,
        "Receipt should wait for deliverable",
        ["software"],
        deadline
      );

    const taskId = await taskEscrow.getTaskCount();

    await expect(
      workReceipt
        .connect(provider)
        .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"))
    ).to.be.revertedWith("Task not submitted");
  });

  it("rejects duplicate receipts for the same task", async function () {
    const fixture = await deployFixture();
    const { provider, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await expect(
      workReceipt
        .connect(provider)
        .createReceipt(taskId, "ipfs://proof-v2", ethers.id("proof-v2"))
    ).to.be.revertedWith("Receipt already exists");
  });

  it("rejects verification from inactive verifiers", async function () {
    const fixture = await deployFixture();
    const { provider, verifier, verifierRegistry, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);
    await registerVerifier(fixture);
    await verifierRegistry.deactivateVerifier(verifier.address);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await expect(
      workReceipt
        .connect(verifier)
        .passReceipt(1, 9400, "ipfs://verified-proof", ethers.id("verified-proof"))
    ).to.be.revertedWith("Verifier not active");
  });

  it("lets an active verifier pass a pending receipt and update agent stats", async function () {
    const fixture = await deployFixture();
    const { provider, verifier, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);
    await registerVerifier(fixture);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await expect(
      workReceipt
        .connect(verifier)
        .passReceipt(1, 9400, "ipfs://verified-proof", ethers.id("verified-proof"))
    )
      .to.emit(workReceipt, "ReceiptVerified")
      .withArgs(1, taskId, verifier.address, RECEIPT_STATUS_PASSED, 9400);

    const receipt = await workReceipt.getReceipt(1);
    expect(receipt.verifier).to.equal(verifier.address);
    expect(receipt.status).to.equal(RECEIPT_STATUS_PASSED);
    expect(receipt.score).to.equal(9400);
    expect(receipt.proofURI).to.equal("ipfs://verified-proof");

    const stats = await workReceipt.getAgentVerificationStats(provider.address);
    expect(stats.totalReceipts).to.equal(1);
    expect(stats.passedReceipts).to.equal(1);
    expect(stats.failedReceipts).to.equal(0);
    expect(stats.averageScore).to.equal(9400);
    expect(stats.passRate).to.equal(10000);
  });

  it("lets an active verifier fail a pending receipt and update agent stats", async function () {
    const fixture = await deployFixture();
    const { provider, verifier, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);
    await registerVerifier(fixture);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await workReceipt
      .connect(verifier)
      .failReceipt(1, 4500, "ipfs://failed-proof", ethers.id("failed-proof"));

    const receipt = await workReceipt.getReceipt(1);
    expect(receipt.status).to.equal(RECEIPT_STATUS_FAILED);
    expect(receipt.score).to.equal(4500);

    const stats = await workReceipt.getAgentVerificationStats(provider.address);
    expect(stats.totalReceipts).to.equal(1);
    expect(stats.passedReceipts).to.equal(0);
    expect(stats.failedReceipts).to.equal(1);
    expect(stats.averageScore).to.equal(4500);
    expect(stats.passRate).to.equal(0);
  });

  it("rejects scores above 10000", async function () {
    const fixture = await deployFixture();
    const { provider, verifier, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);
    await registerVerifier(fixture);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await expect(
      workReceipt
        .connect(verifier)
        .passReceipt(1, 10001, "ipfs://verified-proof", ethers.id("verified-proof"))
    ).to.be.revertedWith("Invalid score");
  });

  it("rejects verifying a finalized receipt twice", async function () {
    const fixture = await deployFixture();
    const { provider, verifier, workReceipt } = fixture;
    const taskId = await createSubmittedTask(fixture);
    await registerVerifier(fixture);

    await workReceipt
      .connect(provider)
      .createReceipt(taskId, "ipfs://proof-v1", ethers.id("proof-v1"));

    await workReceipt
      .connect(verifier)
      .passReceipt(1, 9400, "ipfs://verified-proof", ethers.id("verified-proof"));

    await expect(
      workReceipt
        .connect(verifier)
        .failReceipt(1, 2000, "ipfs://failed-proof", ethers.id("failed-proof"))
    ).to.be.revertedWith("Receipt finalized");
  });

  it("returns no receipt for tasks without receipts", async function () {
    const fixture = await deployFixture();
    const { workReceipt } = fixture;

    const receipt = await workReceipt.getReceiptByTask(777);
    expect(receipt.id).to.equal(0);
    expect(receipt.taskId).to.equal(0);
    expect(receipt.provider).to.equal(ZERO_ADDRESS);
  });
});
