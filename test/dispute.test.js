const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * The dispute path moves the entire escrow, and had no coverage: `disputeTask`
 * was only touched incidentally and `resolveDispute` not at all. That is the same
 * gap that let the original authorization blocker ship.
 */
describe("Dispute resolution", function () {
  const DAY = 24 * 60 * 60;
  const STATUS_SUBMITTED = 3;
  const STATUS_DISPUTED = 6;
  const STATUS_RESOLVED = 7;
  const FEE_BPS = 250n;

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
    const agentRegistry = await (
      await ethers.getContractFactory("AgentRegistry")
    ).deploy();
    const taskEscrow = await (
      await ethers.getContractFactory("TaskEscrow")
    ).deploy(await usdc.getAddress(), await agentRegistry.getAddress());

    await agentRegistry.setAuthorizedWriter(await taskEscrow.getAddress(), true);
    await agentRegistry
      .connect(provider)
      .registerAgent("Agent", "does things", ["software"], 1, 1, "");
    await usdc.mint(requester.address, ethers.parseUnits("10000", 6));

    return { owner, requester, provider, other, usdc, agentRegistry, taskEscrow };
  }

  /** Drives a task to Submitted, the only status a dispute can be raised from. */
  async function submittedTask(fixture, budget = ethers.parseUnits("100", 6)) {
    const { requester, provider, usdc, taskEscrow } = fixture;
    const escrowAddress = await taskEscrow.getAddress();
    const block = await ethers.provider.getBlock("latest");

    await usdc.connect(requester).approve(escrowAddress, budget);
    await taskEscrow
      .connect(requester)
      .createTask(
        provider.address,
        budget,
        "contested work",
        ["software"],
        BigInt(block.timestamp + 30 * DAY),
      );
    const taskId = await taskEscrow.getTaskCount();
    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("d"), "ipfs://d");

    return { taskId, budget };
  }

  describe("raising a dispute", function () {
    it("lets the requester contest submitted work", async function () {
      const fixture = await deployFixture();
      const { requester, taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      await expect(
        taskEscrow.connect(requester).disputeTask(taskId, "deliverable is empty"),
      )
        .to.emit(taskEscrow, "TaskDisputed")
        .withArgs(taskId, requester.address, "deliverable is empty");

      expect((await taskEscrow.getTask(taskId))[4]).to.equal(STATUS_DISPUTED);
    });

    it("lets the provider contest too", async function () {
      const fixture = await deployFixture();
      const { provider, taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      await taskEscrow.connect(provider).disputeTask(taskId, "scope changed");
      expect((await taskEscrow.getTask(taskId))[4]).to.equal(STATUS_DISPUTED);
    });

    it("rejects a stranger", async function () {
      const fixture = await deployFixture();
      const { other, taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      await expect(
        taskEscrow.connect(other).disputeTask(taskId, "not my task"),
      ).to.be.revertedWith("Not party");
    });

    it("rejects a task that is not submitted", async function () {
      const fixture = await deployFixture();
      const { requester, taskEscrow, usdc } = fixture;
      const budget = ethers.parseUnits("10", 6);
      const block = await ethers.provider.getBlock("latest");

      await usdc
        .connect(requester)
        .approve(await taskEscrow.getAddress(), budget);
      await taskEscrow
        .connect(requester)
        .createTask(
          fixture.provider.address,
          budget,
          "nothing delivered yet",
          ["software"],
          BigInt(block.timestamp + DAY),
        );
      const taskId = await taskEscrow.getTaskCount();

      await expect(
        taskEscrow.connect(requester).disputeTask(taskId, "too early to dispute"),
      ).to.be.revertedWith("Not submitted");
    });

    it("closes once the dispute window lapses", async function () {
      const fixture = await deployFixture();
      const { requester, taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      // The window is 3 days from submission.
      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        taskEscrow.connect(requester).disputeTask(taskId, "far too late now"),
      ).to.be.revertedWith("Dispute window closed");
    });

    it("blocks approval and the uncontested claim once disputed", async function () {
      const fixture = await deployFixture();
      const { requester, provider, taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      await taskEscrow.connect(requester).disputeTask(taskId, "deliverable is empty");
      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      // A disputed task has exactly one exit, and this is why the resolve UI
      // must ship with the dispute UI.
      await expect(
        taskEscrow.connect(requester).approveTask(taskId),
      ).to.be.revertedWith("Not submitted");
      await expect(
        taskEscrow.connect(provider).claimUncontestedTask(taskId),
      ).to.be.revertedWith("Not submitted");
    });
  });

  describe("resolving a dispute", function () {
    async function disputed(fixture, budget) {
      const { taskId } = await submittedTask(fixture, budget);
      await fixture.taskEscrow
        .connect(fixture.requester)
        .disputeTask(taskId, "deliverable is empty");
      return taskId;
    }

    it("splits the budget between both parties", async function () {
      const fixture = await deployFixture();
      const { requester, provider, usdc, taskEscrow } = fixture;
      const budget = ethers.parseUnits("100", 6);
      const taskId = await disputed(fixture, budget);

      const requesterBefore = await usdc.balanceOf(requester.address);
      const providerBefore = await usdc.balanceOf(provider.address);

      await expect(taskEscrow.resolveDispute(taskId, 40))
        .to.emit(taskEscrow, "TaskResolved")
        .withArgs(taskId, ethers.parseUnits("40", 6), ethers.parseUnits("60", 6));

      expect(await usdc.balanceOf(requester.address)).to.equal(
        requesterBefore + ethers.parseUnits("40", 6),
      );
      expect(await usdc.balanceOf(provider.address)).to.equal(
        providerBefore + ethers.parseUnits("60", 6),
      );
      expect((await taskEscrow.getTask(taskId))[4]).to.equal(STATUS_RESOLVED);
    });

    it("empties the escrow and takes no platform fee", async function () {
      const fixture = await deployFixture();
      const { owner, usdc, taskEscrow } = fixture;
      const budget = ethers.parseUnits("100", 6);
      const taskId = await disputed(fixture, budget);

      const ownerBefore = await usdc.balanceOf(owner.address);
      await taskEscrow.resolveDispute(taskId, 50);

      // approveTask charges FEE_BPS; a resolution deliberately does not.
      expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore);
      expect(FEE_BPS).to.be.greaterThan(0);
      expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(0);
    });

    it("awards the whole budget at either extreme", async function () {
      for (const [percent, side] of [
        [100, "requester"],
        [0, "provider"],
      ]) {
        const fixture = await deployFixture();
        const { requester, provider, usdc, taskEscrow } = fixture;
        const budget = ethers.parseUnits("75", 6);
        const taskId = await disputed(fixture, budget);

        const requesterBefore = await usdc.balanceOf(requester.address);
        const providerBefore = await usdc.balanceOf(provider.address);
        await taskEscrow.resolveDispute(taskId, percent);

        const requesterGain =
          (await usdc.balanceOf(requester.address)) - requesterBefore;
        const providerGain =
          (await usdc.balanceOf(provider.address)) - providerBefore;

        if (side === "requester") {
          expect(requesterGain).to.equal(budget);
          expect(providerGain).to.equal(0);
        } else {
          expect(requesterGain).to.equal(0);
          expect(providerGain).to.equal(budget);
        }
      }
    });

    it("sends truncated dust to the provider, never stranding it", async function () {
      const fixture = await deployFixture();
      const { requester, provider, usdc, taskEscrow } = fixture;
      // 7 units at 33% truncates to 2, leaving 5 — the remainder must move.
      const budget = BigInt(7);
      const taskId = await disputed(fixture, budget);

      const requesterBefore = await usdc.balanceOf(requester.address);
      const providerBefore = await usdc.balanceOf(provider.address);
      await taskEscrow.resolveDispute(taskId, 33);

      expect(
        (await usdc.balanceOf(requester.address)) - requesterBefore,
      ).to.equal(BigInt(2));
      expect((await usdc.balanceOf(provider.address)) - providerBefore).to.equal(
        BigInt(5),
      );
      expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(0);
    });

    it("only lets the owner resolve", async function () {
      const fixture = await deployFixture();
      const { requester, other, taskEscrow } = fixture;
      const taskId = await disputed(fixture);

      for (const signer of [requester, other]) {
        await expect(
          taskEscrow.connect(signer).resolveDispute(taskId, 50),
        ).to.be.revertedWithCustomError(
          taskEscrow,
          "OwnableUnauthorizedAccount",
        );
      }
    });

    it("rejects a share above 100 percent", async function () {
      const fixture = await deployFixture();
      const taskId = await disputed(fixture);

      await expect(
        fixture.taskEscrow.resolveDispute(taskId, 101),
      ).to.be.revertedWith("Invalid percent");
    });

    it("rejects a task that is not disputed, and cannot resolve twice", async function () {
      const fixture = await deployFixture();
      const { taskEscrow } = fixture;
      const { taskId } = await submittedTask(fixture);

      await expect(taskEscrow.resolveDispute(taskId, 50)).to.be.revertedWith(
        "Not disputed",
      );

      await fixture.taskEscrow
        .connect(fixture.requester)
        .disputeTask(taskId, "deliverable is empty");
      await taskEscrow.resolveDispute(taskId, 50);
      await expect(taskEscrow.resolveDispute(taskId, 50)).to.be.revertedWith(
        "Not disputed",
      );
    });

    it("does not credit the provider's completed-task count", async function () {
      const fixture = await deployFixture();
      const { provider, agentRegistry, taskEscrow } = fixture;
      const taskId = await disputed(fixture);

      await taskEscrow.resolveDispute(taskId, 50);

      // Only approveTask and claimUncontestedTask record completion; a contested
      // task should not read as a clean delivery.
      const agent = await agentRegistry.getAgent(provider.address);
      expect(agent.completedTasks).to.equal(0);
      expect(agent.totalEarnings).to.equal(0);
      expect(STATUS_SUBMITTED).to.equal(3);
    });
  });
});
