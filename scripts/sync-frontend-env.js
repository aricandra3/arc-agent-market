/**
 * Writes the deployed addresses into frontend/.env.local.
 *
 *   node scripts/sync-frontend-env.js [network]     # default: arcTestnet
 *
 * Reads deployments/<network>.json and updates the NEXT_PUBLIC_* entries in
 * place, leaving every other line — the WalletConnect project id, any local
 * overrides — untouched. Run it after every deploy; copying twelve addresses by
 * hand is how the wrong ones end up in the wrong file.
 *
 * A plain node script on purpose: it touches no chain, so it should not need a
 * hardhat runtime or a funded key.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/** NEXT_PUBLIC_* variable -> key in the deployment record. */
const ADDRESS_VARS = {
  NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: "AgentRegistry",
  NEXT_PUBLIC_TASK_ESCROW_ADDRESS: "TaskEscrow",
  NEXT_PUBLIC_MICRO_PAYMENT_ADDRESS: "MicroPayment",
  NEXT_PUBLIC_REPUTATION_ADDRESS: "Reputation",
  NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS: "VerifierRegistry",
  NEXT_PUBLIC_WORK_RECEIPT_ADDRESS: "WorkReceipt",
  NEXT_PUBLIC_USDC_ADDRESS: "USDC",
};

function loadDeployment(network) {
  const file = path.join(ROOT, "deployments", `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No deployment record at ${path.relative(process.cwd(), file)}. ` +
        "Deploy first: npx hardhat run scripts/deploy.js --network " + network,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const network = process.argv[2] || "arcTestnet";
  const deployment = loadDeployment(network);

  const desired = new Map();
  for (const [variable, key] of Object.entries(ADDRESS_VARS)) {
    const value = deployment[key];
    if (!value) {
      console.warn(`[!] ${key} missing from the record — skipping ${variable}`);
      continue;
    }
    desired.set(variable, value);
  }

  // Only pin the chain for a local network. On a public one the defaults in
  // contracts.ts are correct, and a stale localhost RPC baked into a build is a
  // problem that outlives the dev server.
  if (deployment.rpcUrl) {
    desired.set("NEXT_PUBLIC_ARC_RPC_URL", deployment.rpcUrl);
  }
  if (deployment.chainId && deployment.chainId !== 5042002) {
    desired.set("NEXT_PUBLIC_ARC_CHAIN_ID", String(deployment.chainId));
  }

  const envPath = path.join(ROOT, "frontend", ".env.local");
  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8").split("\n")
    : [];

  const seen = new Set();
  const changes = [];

  const updated = existing.map((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match) return line;

    const [, variable, current] = match;
    if (!desired.has(variable)) return line;

    seen.add(variable);
    const value = desired.get(variable);
    if (current.trim().toLowerCase() === value.toLowerCase()) return line;

    changes.push(`  ~ ${variable}`);
    return `${variable}=${value}`;
  });

  const added = [...desired.entries()].filter(([variable]) => !seen.has(variable));
  if (added.length > 0) {
    if (updated.length > 0 && updated[updated.length - 1].trim() !== "") {
      updated.push("");
    }
    updated.push(
      `# Written by scripts/sync-frontend-env.js from deployments/${network}.json`,
      `# Deployed ${deployment.deployedAt ?? "unknown"} on ${network}`,
    );
    for (const [variable, value] of added) {
      updated.push(`${variable}=${value}`);
      changes.push(`  + ${variable}`);
    }
  }

  if (changes.length === 0) {
    console.log(`frontend/.env.local already matches deployments/${network}.json`);
    return;
  }

  fs.writeFileSync(envPath, `${updated.join("\n").replace(/\n+$/, "")}\n`);

  console.log(`Updated frontend/.env.local from deployments/${network}.json:`);
  for (const change of changes) console.log(change);
  console.log(
    "\nNEXT_PUBLIC_* is inlined at compile time, so clear the build before" +
      "\nserving, or the old addresses keep being served:" +
      "\n\n  rm -rf frontend/.next\n",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
