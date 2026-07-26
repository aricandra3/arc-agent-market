const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Regression cover for the round of correctness fixes:
 *  1. rating scale (x100) so getTrustScore's rating term is not always 0
 *  2. getReviews pagination past the end (was panic 0x11)
 *  3. skillIndex staleness on updateAgent
 *  4. MicroPayment.stopStream stranding the platform fee
 *  5. escrow locked forever when a requester ignores a submitted deliverable
 */
describe("Correctness fixes", function () {
  const FEE_BPS = 250n;
  const DAY = 24 * 60 * 60;

  // Several cases advance the chain clock. Snapshot/revert keeps that from
  // leaking into sibling test files, which share one Hardhat network.
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
    const reputation = await (
      await ethers.getContractFactory("Reputation")
    ).deploy(await taskEscrow.getAddress(), await agentRegistry.getAddress());
    const microPayment = await (
      await ethers.getContractFactory("MicroPayment")
    ).deploy(await usdc.getAddress());

    await agentRegistry.setAuthorizedWriter(await taskEscrow.getAddress(), true);
    await agentRegistry.setAuthorizedWriter(await reputation.getAddress(), true);

    await usdc.mint(requester.address, ethers.parseUnits("10000", 6));

    return {
      owner,
      requester,
      provider,
      other,
      usdc,
      agentRegistry,
      taskEscrow,
      reputation,
      microPayment,
    };
  }

  async function registerProvider(fixture, signer, skills = ["software"]) {
    await fixture.agentRegistry
      .connect(signer)
      .registerAgent("Agent", "does things", skills, 1, 1, "");
  }

  async function submittedTask(fixture, budget = ethers.parseUnits("100", 6)) {
    const { requester, provider, usdc, taskEscrow } = fixture;
    const block = await ethers.provider.getBlock("latest");
    await usdc.connect(requester).approve(await taskEscrow.getAddress(), budget);
    await taskEscrow
      .connect(requester)
      .createTask(
        provider.address,
        budget,
        "work",
        ["software"],
        BigInt(block.timestamp + 30 * DAY),
      );
    const taskId = await taskEscrow.getTaskCount();
    await taskEscrow
      .connect(provider)
      .submitDeliverable(taskId, ethers.id("d"), "ipfs://d");
    return { taskId, budget };
  }

  async function paidTask(fixture) {
    const { requester, taskEscrow } = fixture;
    const { taskId } = await submittedTask(fixture);
    await taskEscrow.connect(requester).approveTask(taskId);
    return taskId;
  }

  describe("rating scale", function () {
    it("reports a whole-star average scaled by 100", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider, requester, reputation } = fixture;
      await registerProvider(fixture, provider);

      const taskId = await paidTask(fixture);
      await reputation.connect(requester).submitReview(taskId, 5, "great");

      // 5.00 stars, not the raw 5 the UI would render as 0.05.
      expect(await agentRegistry.getAverageRating(provider.address)).to.equal(500);
      const agent = await agentRegistry.getAgent(provider.address);
      expect(agent.averageRating).to.equal(500);
    });

    it("keeps half-star precision across reviews", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider, other, requester, reputation, taskEscrow } =
        fixture;
      await registerProvider(fixture, provider);

      const first = await paidTask(fixture);
      await reputation.connect(requester).submitReview(first, 5, "great");
      const second = await paidTask(fixture);
      await reputation.connect(requester).submitReview(second, 4, "good");

      // (5 + 4) / 2 = 4.50 — previously truncated to 4.
      expect(await agentRegistry.getAverageRating(provider.address)).to.equal(450);
      const rep = await reputation.getReputation(provider.address);
      expect(rep.averageRating).to.equal(450);
      expect(other.address && taskEscrow.target).to.be.ok;
    });

    it("returns 0 for an unrated agent", async function () {
      const fixture = await deployFixture();
      await registerProvider(fixture, fixture.provider);
      expect(
        await fixture.agentRegistry.getAverageRating(fixture.provider.address),
      ).to.equal(0);
    });

    it("gives a five-star agent the full 60-point rating component", async function () {
      const fixture = await deployFixture();
      const { provider, requester, reputation } = fixture;
      await registerProvider(fixture, provider);

      const taskId = await paidTask(fixture);
      await reputation.connect(requester).submitReview(taskId, 5, "great");

      // Rating term is 60 of the 100-point score; completionRate/completedTasks
      // are admin-fed and still zero here.
      expect(await reputation.getTrustScore(provider.address)).to.equal(60);
    });

    it("scales the rating component proportionally", async function () {
      const fixture = await deployFixture();
      const { provider, requester, reputation } = fixture;
      await registerProvider(fixture, provider);

      const taskId = await paidTask(fixture);
      await reputation.connect(requester).submitReview(taskId, 3, "ok");

      // 3/5 * 60 = 36
      expect(await reputation.getTrustScore(provider.address)).to.equal(36);
    });
  });

  describe("getReviews pagination", function () {
    it("returns an empty page past the end instead of reverting", async function () {
      const fixture = await deployFixture();
      const { provider, requester, reputation } = fixture;
      await registerProvider(fixture, provider);
      const taskId = await paidTask(fixture);
      await reputation.connect(requester).submitReview(taskId, 5, "great");

      const page = await reputation.getReviews(provider.address, 5, 10);
      expect(page.reviewIds.length).to.equal(0);
      expect(page.comments.length).to.equal(0);
    });

    it("returns an empty page for an agent with no reviews", async function () {
      const { reputation, provider } = await deployFixture();
      const page = await reputation.getReviews(provider.address, 0, 10);
      expect(page.reviewIds.length).to.equal(0);
    });

    it("clamps a page that overruns the end", async function () {
      const fixture = await deployFixture();
      const { provider, requester, reputation } = fixture;
      await registerProvider(fixture, provider);
      const taskId = await paidTask(fixture);
      await reputation.connect(requester).submitReview(taskId, 5, "great");

      const page = await reputation.getReviews(provider.address, 0, 50);
      expect(page.reviewIds.length).to.equal(1);
      expect(page.ratings[0]).to.equal(5);
      expect(page.comments[0]).to.equal("great");
    });
  });

  describe("skill index", function () {
    it("drops an agent from skills it no longer lists", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider } = fixture;
      await registerProvider(fixture, provider, ["solidity", "testing"]);

      expect(await agentRegistry.getAgentsBySkill("solidity")).to.deep.equal([
        provider.address,
      ]);

      await agentRegistry
        .connect(provider)
        .updateAgent(["copywriting"], 1, 1, "");

      expect(await agentRegistry.getAgentsBySkill("solidity")).to.deep.equal([]);
      expect(await agentRegistry.getAgentsBySkill("testing")).to.deep.equal([]);
      expect(await agentRegistry.getAgentsBySkill("copywriting")).to.deep.equal([
        provider.address,
      ]);
    });

    it("does not duplicate an agent that keeps a skill", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider } = fixture;
      await registerProvider(fixture, provider, ["solidity"]);

      await agentRegistry
        .connect(provider)
        .updateAgent(["solidity", "audit"], 1, 1, "");
      await agentRegistry
        .connect(provider)
        .updateAgent(["solidity", "audit"], 2, 2, "");

      expect(await agentRegistry.getAgentsBySkill("solidity")).to.deep.equal([
        provider.address,
      ]);
      expect(await agentRegistry.getAgentsBySkill("audit")).to.deep.equal([
        provider.address,
      ]);
    });

    it("ignores duplicate skills in the input", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider } = fixture;
      await agentRegistry
        .connect(provider)
        .registerAgent("A", "d", ["solidity", "solidity"], 1, 1, "");

      expect(await agentRegistry.getAgentsBySkill("solidity")).to.deep.equal([
        provider.address,
      ]);
    });

    it("keeps other agents intact when one leaves a skill", async function () {
      const fixture = await deployFixture();
      const { agentRegistry, provider, other, requester } = fixture;
      await registerProvider(fixture, provider, ["solidity"]);
      await registerProvider(fixture, other, ["solidity"]);
      await registerProvider(fixture, requester, ["solidity"]);

      await agentRegistry.connect(other).updateAgent(["rust"], 1, 1, "");

      const remaining = await agentRegistry.getAgentsBySkill("solidity");
      expect(remaining).to.have.lengthOf(2);
      expect(remaining).to.include(provider.address);
      expect(remaining).to.include(requester.address);
      expect(remaining).to.not.include(other.address);
    });

    it("rejects an update that would clear every skill", async function () {
      const fixture = await deployFixture();
      await registerProvider(fixture, fixture.provider);

      await expect(
        fixture.agentRegistry.connect(fixture.provider).updateAgent([], 1, 1, ""),
      ).to.be.revertedWith("At least one skill required");
    });
  });

  describe("MicroPayment.stopStream", function () {
    it("forwards the platform fee instead of stranding it", async function () {
      const { owner, requester, provider, usdc, microPayment } =
        await deployFixture();
      const cap = ethers.parseUnits("100", 6);
      const rate = ethers.parseUnits("1", 6);

      await usdc.connect(requester).approve(await microPayment.getAddress(), cap);
      await microPayment.connect(requester).createStream(provider.address, rate, cap, 0);
      const streamId = await microPayment.getStreamCount();

      await microPayment.connect(provider).recordUnits(streamId, 50);

      const accrued = rate * 50n;
      const fee = (accrued * FEE_BPS) / 10000n;
      const payout = accrued - fee;
      const ownerBefore = await usdc.balanceOf(owner.address);
      const senderBefore = await usdc.balanceOf(requester.address);

      await microPayment.connect(requester).stopStream(streamId);

      expect(await usdc.balanceOf(provider.address)).to.equal(payout);
      expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore + fee);
      expect(await usdc.balanceOf(requester.address)).to.equal(
        senderBefore + (cap - accrued),
      );
      // Nothing left behind.
      expect(await usdc.balanceOf(await microPayment.getAddress())).to.equal(0);
    });

    it("still settles a stream with nothing consumed", async function () {
      const { requester, provider, usdc, microPayment } = await deployFixture();
      const cap = ethers.parseUnits("40", 6);

      await usdc.connect(requester).approve(await microPayment.getAddress(), cap);
      await microPayment
        .connect(requester)
        .createStream(provider.address, ethers.parseUnits("1", 6), cap, 0);
      const streamId = await microPayment.getStreamCount();

      const before = await usdc.balanceOf(requester.address);
      await microPayment.connect(requester).stopStream(streamId);

      expect(await usdc.balanceOf(requester.address)).to.equal(before + cap);
      expect(await usdc.balanceOf(await microPayment.getAddress())).to.equal(0);
    });
  });

  describe("uncontested submitted work", function () {
    it("cannot be claimed while the dispute window is open", async function () {
      const fixture = await deployFixture();
      await registerProvider(fixture, fixture.provider);
      const { taskId } = await submittedTask(fixture);

      await expect(
        fixture.taskEscrow.connect(fixture.provider).claimUncontestedTask(taskId),
      ).to.be.revertedWith("Dispute window open");
    });

    it("pays the provider once the dispute window lapses", async function () {
      const fixture = await deployFixture();
      const { owner, provider, usdc, taskEscrow, agentRegistry } = fixture;
      await registerProvider(fixture, provider);
      const { taskId, budget } = await submittedTask(fixture);

      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      const fee = (budget * FEE_BPS) / 10000n;
      const payout = budget - fee;
      const ownerBefore = await usdc.balanceOf(owner.address);

      await expect(taskEscrow.connect(provider).claimUncontestedTask(taskId))
        .to.emit(taskEscrow, "TaskAutoReleased")
        .withArgs(taskId, payout);

      expect(await usdc.balanceOf(provider.address)).to.equal(payout);
      expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore + fee);
      expect(await usdc.balanceOf(await taskEscrow.getAddress())).to.equal(0);
      expect((await taskEscrow.getTask(taskId))[4]).to.equal(5); // Paid

      const agent = await agentRegistry.getAgent(provider.address);
      expect(agent.completedTasks).to.equal(1);
    });

    it("can be triggered by a third party, and only pays the provider", async function () {
      const fixture = await deployFixture();
      const { provider, other, usdc, taskEscrow } = fixture;
      await registerProvider(fixture, provider);
      const { taskId, budget } = await submittedTask(fixture);

      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      const otherBefore = await usdc.balanceOf(other.address);
      await taskEscrow.connect(other).claimUncontestedTask(taskId);

      expect(await usdc.balanceOf(other.address)).to.equal(otherBefore);
      expect(await usdc.balanceOf(provider.address)).to.equal(
        budget - (budget * FEE_BPS) / 10000n,
      );
    });

    it("cannot be claimed twice, or after approval", async function () {
      const fixture = await deployFixture();
      const { requester, provider, taskEscrow } = fixture;
      await registerProvider(fixture, provider);
      const { taskId } = await submittedTask(fixture);

      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      await taskEscrow.connect(provider).claimUncontestedTask(taskId);
      await expect(
        taskEscrow.connect(provider).claimUncontestedTask(taskId),
      ).to.be.revertedWith("Not submitted");
      await expect(
        taskEscrow.connect(requester).approveTask(taskId),
      ).to.be.revertedWith("Not submitted");
    });

    it("is blocked once the task is disputed", async function () {
      const fixture = await deployFixture();
      const { requester, provider, taskEscrow } = fixture;
      await registerProvider(fixture, provider);
      const { taskId } = await submittedTask(fixture);

      await taskEscrow.connect(requester).disputeTask(taskId, "not as specified");
      await ethers.provider.send("evm_increaseTime", [4 * DAY]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        taskEscrow.connect(provider).claimUncontestedTask(taskId),
      ).to.be.revertedWith("Not submitted");
    });
  });
});
