/**
 * End-to-end check of the write path against a real chain, using the same
 * modules the UI uses: store provider → sendTransaction → waitForTx → read back.
 *
 * Skipped unless a local node is wired up:
 *
 *   npx hardhat node                                            # terminal 1
 *   npx hardhat run scripts/seed-local.js --network localhost    # terminal 2
 *   cd frontend && ARC_INTEGRATION=1 npm test
 *
 * It reads addresses from deployments/localhost.json, so no manual copying.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient, encodeFunctionData, http } from "viem";

const ENABLED = process.env.ARC_INTEGRATION === "1";
const DEPLOYMENT_PATH = resolve(
  import.meta.dirname,
  "../../../deployments/localhost.json",
);

type Deployment = {
  rpcUrl: string;
  chainId: number;
  provider: string;
  TaskEscrow: `0x${string}`;
};

function loadDeployment(): Deployment {
  return JSON.parse(readFileSync(DEPLOYMENT_PATH, "utf8")) as Deployment;
}

describe.skipIf(!ENABLED)("write path against a local chain", () => {
  let deployment: Deployment;

  beforeAll(async () => {
    deployment = loadDeployment();
    // Point the app's modules at the local chain before they are imported.
    process.env.NEXT_PUBLIC_ARC_RPC_URL = deployment.rpcUrl;
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID = String(deployment.chainId);
    process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS = deployment.TaskEscrow;
  });

  it("submits a deliverable and reads back the Submitted status", async () => {
    const { TASK_ESCROW_ABI, arcTestnet } = await import("@/lib/contracts");
    const { resolveDeliverableCommitment } = await import("@/lib/deliverable");
    const { useWalletStore } = await import("@/lib/store");
    const { sendTransaction, waitForTx } = await import("@/lib/tx");

    const rpc = createPublicClient({
      chain: arcTestnet,
      transport: http(deployment.rpcUrl),
    });

    // A node-backed EIP-1193 provider, standing in for a browser wallet.
    useWalletStore.getState().setConnected(deployment.provider, arcTestnet.id, {
      request: (args) =>
        rpc.request(args as Parameters<typeof rpc.request>[0]) as Promise<unknown>,
    });

    const readStatus = async (taskId: bigint) =>
      Number(
        (
          await rpc.readContract({
            address: deployment.TaskEscrow,
            abi: TASK_ESCROW_ABI,
            functionName: "getTask",
            args: [taskId],
          })
        )[4],
      );

    // Task 2 is seeded as Accepted (1) and assigned to `provider`.
    const taskId = BigInt(2);
    expect(await readStatus(taskId)).toBe(1);

    const commitment = resolveDeliverableCommitment(
      "ipfs://bafyintegrationdeliverable",
      "",
    );
    if (!commitment.ok) throw new Error(commitment.error);

    const hash = await sendTransaction({
      to: deployment.TaskEscrow,
      data: encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: "submitDeliverable",
        args: [taskId, commitment.hash, commitment.uri],
      }),
    });

    const receipt = await waitForTx(hash);
    expect(receipt.status).toBe("success");

    // Submitted (3), with the URI and derived hash committed on chain.
    const task = await rpc.readContract({
      address: deployment.TaskEscrow,
      abi: TASK_ESCROW_ABI,
      functionName: "getTask",
      args: [taskId],
    });
    expect(Number(task[4])).toBe(3);
    expect(task[8]).toBe(commitment.uri);
    expect(task[7]).toBe(commitment.hash);
  }, 30_000);
});
