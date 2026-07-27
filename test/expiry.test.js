const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Task expiry, and the funds-locking hole it used to leave.
 *
 * `expireTask` accepted only Open and Accepted. A provider who called
 * `startTask` — a pure status change that grants them nothing — and then missed
 * the deadline made the escrow unreachable by anyone: `submitDeliverable` rejects
 * an expired task, and every other exit requires Submitted, Open or Disputed.
 */
describe("Task expiry", function () {
  const DAY = 24 * 60 * 60;
  const STATUS_EXPIRED = 9;

  let snapshotId;

  beforeEach(async function () {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  async function deployFixture() {
    const [owner, requester, provider, other] = await ethers.getSigners();

    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const registry = await (
      await ethers.getContractFactory("AgentRegistry")
    ).deploy();
    const escrow = await (
      await ethers.getContractFactory("TaskEscrow")
    ).deploy(await usdc.getAddress(), await registry.getAddress());

    await registry.setAuthorizedWriter(await escrow.getAddress(), true);
    await registry.connect(provider).registerAgent("A", "d", ["x"], 1, 1, "");
    await usdc.mint(requester.address, ethers.parseUnits("1000", 6));

    return { owner, requester, provider, other, usdc, registry, escrow };
  }

  async function createTask(fixture, providerAddress, days = 1) {
    const { requester, usdc, escrow } = fixture;
    const budget = ethers.parseUnits("50", 6);
    const block = await ethers.provider.getBlock("latest");

    await usdc.connect(requester).approve(await escrow.getAddress(), budget);
    await escrow
      .connect(requester)
      .createTask(
        providerAddress,
        budget,
        "work",
        ["x"],
        BigInt(block.timestamp + days * DAY),
      );

    return { taskId: await escrow.getTaskCount(), budget };
  }

  async function passDeadline() {
    await ethers.provider.send("evm_increaseTime", [2 * DAY]);
    await ethers.provider.send("evm_mine", []);
  }

  it("refunds an unclaimed open task", async function () {
    const fixture = await deployFixture();
    const { requester, usdc, escrow } = fixture;
    const before = await usdc.balanceOf(requester.address);
    const { taskId, budget } = await createTask(fixture, ethers.ZeroAddress);

    await passDeadline();
    await expect(escrow.expireTask(taskId)).to.emit(escrow, "TaskExpired");

    expect(await usdc.balanceOf(requester.address)).to.equal(before);
    expect((await escrow.getTask(taskId))[4]).to.equal(STATUS_EXPIRED);
    expect(budget).to.be.greaterThan(0);
  });

  it("refunds an accepted task the provider never delivered", async function () {
    const fixture = await deployFixture();
    const { requester, provider, usdc, escrow } = fixture;
    const before = await usdc.balanceOf(requester.address);
    const { taskId } = await createTask(fixture, provider.address);

    await passDeadline();
    await escrow.expireTask(taskId);

    expect(await usdc.balanceOf(requester.address)).to.equal(before);
  });

  it("refunds a started task, which used to be unrecoverable", async function () {
    const fixture = await deployFixture();
    const { requester, provider, usdc, escrow } = fixture;
    const before = await usdc.balanceOf(requester.address);
    const { taskId } = await createTask(fixture, provider.address);

    // The trap: startTask moves Accepted -> InProgress and gives the provider
    // nothing, but it used to remove the only exit.
    await escrow.connect(provider).startTask(taskId);
    await passDeadline();

    await expect(escrow.expireTask(taskId)).to.emit(escrow, "TaskExpired");
    expect(await usdc.balanceOf(requester.address)).to.equal(before);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("is permissionless, since funds can only return to the requester", async function () {
    const fixture = await deployFixture();
    const { requester, provider, other, usdc, escrow } = fixture;
    const before = await usdc.balanceOf(requester.address);
    const otherBefore = await usdc.balanceOf(other.address);
    const { taskId } = await createTask(fixture, provider.address);

    await escrow.connect(provider).startTask(taskId);
    await passDeadline();
    await escrow.connect(other).expireTask(taskId);

    expect(await usdc.balanceOf(requester.address)).to.equal(before);
    expect(await usdc.balanceOf(other.address)).to.equal(otherBefore);
  });

  it("refuses to expire before the deadline", async function () {
    const fixture = await deployFixture();
    const { provider, escrow } = fixture;
    const { taskId } = await createTask(fixture, provider.address);

    await expect(escrow.expireTask(taskId)).to.be.revertedWith("Not expired");
    await escrow.connect(provider).startTask(taskId);
    await expect(escrow.expireTask(taskId)).to.be.revertedWith("Not expired");
  });

  it("leaves delivered work alone — expiry is not a way to claw back a submission", async function () {
    const fixture = await deployFixture();
    const { provider, escrow } = fixture;
    const { taskId } = await createTask(fixture, provider.address, 5);

    await escrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("d"), "ipfs://d");
    await ethers.provider.send("evm_increaseTime", [10 * DAY]);
    await ethers.provider.send("evm_mine", []);

    // Submitted work is settled by approval, the uncontested claim, or a
    // dispute — never by a refund.
    await expect(escrow.expireTask(taskId)).to.be.revertedWith("Cannot expire");
  });

  it("cannot be expired twice", async function () {
    const fixture = await deployFixture();
    const { provider, escrow } = fixture;
    const { taskId } = await createTask(fixture, provider.address);

    await passDeadline();
    await escrow.expireTask(taskId);
    await expect(escrow.expireTask(taskId)).to.be.revertedWith("Cannot expire");
  });

  it("does not credit the provider for an expired task", async function () {
    const fixture = await deployFixture();
    const { provider, registry, escrow } = fixture;
    const { taskId } = await createTask(fixture, provider.address);

    await escrow.connect(provider).startTask(taskId);
    await passDeadline();
    await escrow.expireTask(taskId);

    const agent = await registry.getAgent(provider.address);
    expect(agent.completedTasks).to.equal(0);
    expect(agent.totalEarnings).to.equal(0);
  });
});
