const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Ownership handover safety.
 *
 * Motivated by a real incident on the first Arc testnet deployment: ownership of
 * AgentRegistry was transferred to the TaskEscrow *contract* as a workaround for
 * the authorization bug. TaskEscrow has no code path that calls
 * transferOwnership, so registry administration became permanently
 * unreachable. Ownable2Step makes that mistake recoverable — an unaccepted
 * transfer leaves the original owner in control.
 */
describe("Ownership handover", function () {
  const OWNABLE = [
    "AgentRegistry",
    "TaskEscrow",
    "MicroPayment",
    "Reputation",
    "VerifierRegistry",
  ];

  async function deployFixture() {
    const [owner, newOwner, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(
      await usdc.getAddress(),
      await agentRegistry.getAddress(),
    );
    const MicroPayment = await ethers.getContractFactory("MicroPayment");
    const microPayment = await MicroPayment.deploy(await usdc.getAddress());
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy(
      await taskEscrow.getAddress(),
      await agentRegistry.getAddress(),
    );
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.deploy();

    return {
      owner,
      newOwner,
      other,
      contracts: {
        AgentRegistry: agentRegistry,
        TaskEscrow: taskEscrow,
        MicroPayment: microPayment,
        Reputation: reputation,
        VerifierRegistry: verifierRegistry,
      },
    };
  }

  it("starts with the deployer as owner and no pending owner", async function () {
    const { owner, contracts } = await deployFixture();

    for (const name of OWNABLE) {
      expect(await contracts[name].owner(), name).to.equal(owner.address);
      expect(await contracts[name].pendingOwner(), name).to.equal(
        ethers.ZeroAddress,
      );
    }
  });

  it("keeps the old owner in control until the transfer is accepted", async function () {
    const { owner, newOwner, contracts } = await deployFixture();

    for (const name of OWNABLE) {
      const contract = contracts[name];
      await contract.transferOwnership(newOwner.address);

      expect(await contract.pendingOwner(), name).to.equal(newOwner.address);
      expect(await contract.owner(), name).to.equal(owner.address);

      await contract.connect(newOwner).acceptOwnership();
      expect(await contract.owner(), name).to.equal(newOwner.address);
      expect(await contract.pendingOwner(), name).to.equal(ethers.ZeroAddress);
    }
  });

  it("lets a transfer to an address that cannot accept be reverted", async function () {
    // The exact incident: ownership aimed at a contract with no acceptOwnership.
    const { owner, contracts } = await deployFixture();
    const registry = contracts.AgentRegistry;
    const escrowAddress = await contracts.TaskEscrow.getAddress();

    await registry.transferOwnership(escrowAddress);
    expect(await registry.pendingOwner()).to.equal(escrowAddress);

    // Control is not lost: the deployer is still owner and can undo it.
    expect(await registry.owner()).to.equal(owner.address);
    await registry.transferOwnership(ethers.ZeroAddress);
    expect(await registry.pendingOwner()).to.equal(ethers.ZeroAddress);
    expect(await registry.owner()).to.equal(owner.address);

    await registry.setAuthorizedWriter(escrowAddress, true);
    expect(await registry.authorizedWriters(escrowAddress)).to.equal(true);
  });

  it("rejects acceptOwnership from anyone but the pending owner", async function () {
    const { newOwner, other, contracts } = await deployFixture();
    const registry = contracts.AgentRegistry;

    await registry.transferOwnership(newOwner.address);
    await expect(
      registry.connect(other).acceptOwnership(),
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("rejects transferOwnership from a non-owner", async function () {
    const { other, contracts } = await deployFixture();

    for (const name of OWNABLE) {
      await expect(
        contracts[name].connect(other).transferOwnership(other.address),
        name,
      ).to.be.revertedWithCustomError(
        contracts[name],
        "OwnableUnauthorizedAccount",
      );
    }
  });

  it("moves privileged control to the new owner after acceptance", async function () {
    const { owner, newOwner, contracts } = await deployFixture();
    const escrow = contracts.TaskEscrow;
    const registry = contracts.AgentRegistry;

    for (const contract of [escrow, registry]) {
      await contract.transferOwnership(newOwner.address);
      await contract.connect(newOwner).acceptOwnership();
    }

    // Old owner loses admin rights...
    await expect(
      escrow.connect(owner).setPlatformFee(100),
    ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    await expect(
      registry.connect(owner).setAuthorizedWriter(newOwner.address, true),
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

    // ...and the new owner gains them.
    await escrow.connect(newOwner).setPlatformFee(100);
    expect(await escrow.platformFeePercent()).to.equal(100);
    await registry.connect(newOwner).setAuthorizedWriter(newOwner.address, true);
    expect(await registry.authorizedWriters(newOwner.address)).to.equal(true);
  });

  it("routes platform fees to the current owner", async function () {
    // Fees follow owner(), so rotating ownership also moves the revenue.
    const { owner, newOwner, other, contracts } = await deployFixture();
    const { AgentRegistry: registry, TaskEscrow: escrow } = contracts;
    const usdc = await ethers.getContractAt(
      "MockUSDC",
      await escrow.usdc(),
      owner,
    );

    await registry.setAuthorizedWriter(await escrow.getAddress(), true);
    await escrow.transferOwnership(newOwner.address);
    await escrow.connect(newOwner).acceptOwnership();

    await registry
      .connect(other)
      .registerAgent("Agent", "d", ["x"], 1, 1, "");
    const budget = ethers.parseUnits("100", 6);
    await usdc.mint(owner.address, budget);
    await usdc.approve(await escrow.getAddress(), budget);

    const block = await ethers.provider.getBlock("latest");
    await escrow.createTask(
      other.address,
      budget,
      "task",
      ["x"],
      BigInt(block.timestamp + 86400),
    );
    const taskId = await escrow.getTaskCount();
    await escrow
      .connect(other)
      .submitDeliverable(taskId, ethers.id("d"), "ipfs://d");
    await escrow.approveTask(taskId);

    const fee = (budget * 250n) / 10000n;
    expect(await usdc.balanceOf(newOwner.address)).to.equal(fee);
  });
});
