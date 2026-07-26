/**
 * Rotates ownership of an existing deployment to a new address.
 *
 * Use this after a key compromise, or to move control from a deploy key onto a
 * cold wallet / multisig without redeploying.
 *
 *   OWNER_ADDRESS=0xNewOwner npx hardhat run scripts/rotate-owner.js --network arcTestnet
 *
 * Addresses come from deployments/<network>.json. Because the contracts use
 * Ownable2Step, this only *initiates* the transfer — the new owner must call
 * acceptOwnership() on each contract. Run with STATUS=1 to just report state.
 *
 * NOTE: this must be run with the CURRENT owner's key in PRIVATE_KEY. If that
 * key is the compromised one, rotate immediately and assume the attacker may
 * race you; redeploying from a clean key is the safer option.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// Contracts that inherit Ownable2Step. WorkReceipt has no owner.
const OWNABLE = [
  ["AgentRegistry", "AgentRegistry"],
  ["TaskEscrow", "TaskEscrow"],
  ["MicroPayment", "MicroPayment"],
  ["Reputation", "Reputation"],
  ["VerifierRegistry", "VerifierRegistry"],
];

function loadDeployment() {
  const file = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}.json`,
  );
  if (!fs.existsSync(file)) {
    throw new Error(
      `No deployment record at ${path.relative(process.cwd(), file)}. ` +
        "Deploy first, or create the file with the contract addresses.",
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const deployment = loadDeployment();
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error("No signer. Set PRIVATE_KEY in .env.");
  }

  console.log(`Network: ${hre.network.name}`);
  console.log(`Signer:  ${signer.address}\n`);

  const statusOnly = process.env.STATUS === "1";
  const target = process.env.OWNER_ADDRESS?.trim();

  if (!statusOnly) {
    if (!target) {
      throw new Error(
        "Set OWNER_ADDRESS to the new owner, or STATUS=1 to only report state.",
      );
    }
    if (!hre.ethers.isAddress(target)) {
      throw new Error(`OWNER_ADDRESS is not a valid address: ${target}`);
    }
    if (target.toLowerCase() === signer.address.toLowerCase()) {
      throw new Error("OWNER_ADDRESS equals the signer — nothing would change.");
    }
  }

  const skipped = [];

  for (const [key, contractName] of OWNABLE) {
    const address = deployment[key];
    if (!address) {
      skipped.push(`${key}: missing from the deployment record`);
      continue;
    }

    const contract = await hre.ethers.getContractAt(
      contractName,
      address,
      signer,
    );

    let currentOwner;
    try {
      currentOwner = await contract.owner();
    } catch {
      skipped.push(`${key} (${address}): owner() call failed — wrong ABI?`);
      continue;
    }

    let pending = hre.ethers.ZeroAddress;
    try {
      pending = await contract.pendingOwner();
    } catch {
      // Deployed before Ownable2Step; one-step transfer only.
    }

    console.log(`${key} @ ${address}`);
    console.log(`  owner:   ${currentOwner}`);
    if (pending !== hre.ethers.ZeroAddress) {
      console.log(`  pending: ${pending}`);
    }

    if (statusOnly) {
      console.log("");
      continue;
    }

    if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
      skipped.push(
        `${key}: signer is not the owner (owner is ${currentOwner}) — cannot rotate`,
      );
      console.log("  -> SKIPPED (not owner)\n");
      continue;
    }

    await (await contract.transferOwnership(target)).wait();
    console.log(`  -> transfer initiated to ${target}\n`);
  }

  if (skipped.length > 0) {
    console.log("Skipped:");
    for (const reason of skipped) console.log(`  - ${reason}`);
    console.log("");
  }

  if (!statusOnly) {
    console.log(
      `Ownership is PENDING. From ${target}, call acceptOwnership() on each\n` +
        "contract above to complete the handover.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
