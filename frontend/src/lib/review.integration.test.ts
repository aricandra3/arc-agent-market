/**
 * Proves the review and verification wiring against a real chain.
 *
 * Unit tests cover the input rules and the contract suite covers the protocol,
 * but neither catches an ABI entry with the wrong argument order — that
 * compiles, then reverts. This encodes through the app's own ABIs and sends via
 * the app's own tx layer.
 *
 *   npx hardhat node                                            # terminal 1
 *   npx hardhat run scripts/seed-local.js --network localhost    # terminal 2
 *   cd frontend && ARC_INTEGRATION=1 npm test
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
  requester: string;
  provider: string;
  TaskEscrow: `0x${string}`;
  Reputation: `0x${string}`;
  WorkReceipt: `0x${string}`;
  VerifierRegistry: `0x${string}`;
};

describe.skipIf(!ENABLED)("review and verification wiring", () => {
  let deployment: Deployment;

  beforeAll(() => {
    deployment = JSON.parse(
      readFileSync(DEPLOYMENT_PATH, "utf8"),
    ) as Deployment;
    process.env.NEXT_PUBLIC_ARC_RPC_URL = deployment.rpcUrl;
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID = String(deployment.chainId);
    process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS = deployment.TaskEscrow;
    process.env.NEXT_PUBLIC_REPUTATION_ADDRESS = deployment.Reputation;
    process.env.NEXT_PUBLIC_WORK_RECEIPT_ADDRESS = deployment.WorkReceipt;
    process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS =
      deployment.VerifierRegistry;
  });

  /** Node-backed provider standing in for a browser wallet. */
  async function connect(as: string) {
    const { arcTestnet } = await import("@/lib/contracts");
    const { useWalletStore } = await import("@/lib/store");
    const rpc = createPublicClient({
      chain: arcTestnet,
      transport: http(deployment.rpcUrl),
    });
    useWalletStore.getState().setConnected(as, arcTestnet.id, {
      request: (args) =>
        rpc.request(
          args as Parameters<typeof rpc.request>[0],
        ) as Promise<unknown>,
    });
    return rpc;
  }

  it("submits a review through the app's ABI and updates reputation", async () => {
    const { CONTRACTS, REPUTATION_ABI, TASK_ESCROW_ABI, readContract } =
      await import("@/lib/contracts");
    const { validateReview } = await import("@/lib/review");
    const { sendTransaction, waitForTx } = await import("@/lib/tx");
    await connect(deployment.requester);

    // Find the seeded Paid task: status 5.
    const total = Number(
      await readContract({
        address: CONTRACTS.TASK_ESCROW,
        abi: TASK_ESCROW_ABI,
        functionName: "getTaskCount",
      }),
    );
    let paidId = 0;
    for (let id = total; id >= 1; id--) {
      const task = await readContract({
        address: CONTRACTS.TASK_ESCROW,
        abi: TASK_ESCROW_ABI,
        functionName: "getTask",
        args: [BigInt(id)],
      });
      if (Number(task[4]) === 5) {
        paidId = id;
        break;
      }
    }
    expect(paidId, "seed should include a Paid task").toBeGreaterThan(0);

    const alreadyReviewed = await readContract({
      address: CONTRACTS.REPUTATION,
      abi: REPUTATION_ABI,
      functionName: "hasReviewForTask",
      args: [BigInt(paidId), deployment.requester as `0x${string}`],
    });
    expect(alreadyReviewed).toBe(false);

    const draft = validateReview(5, "Exactly as specified.");
    if (!draft.ok) throw new Error(draft.error);

    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.REPUTATION,
        data: encodeFunctionData({
          abi: REPUTATION_ABI,
          functionName: "submitReview",
          args: [BigInt(paidId), draft.rating, draft.comment],
        }),
      }),
    );

    expect(
      await readContract({
        address: CONTRACTS.REPUTATION,
        abi: REPUTATION_ABI,
        functionName: "hasReviewForTask",
        args: [BigInt(paidId), deployment.requester as `0x${string}`],
      }),
    ).toBe(true);

    // The review must land on the provider, scaled by 100.
    const reputation = await readContract({
      address: CONTRACTS.REPUTATION,
      abi: REPUTATION_ABI,
      functionName: "getReputation",
      args: [deployment.provider as `0x${string}`],
    });
    expect(reputation[0]).toBe(BigInt(500));
    expect(reputation[1]).toBe(BigInt(1));

    // getTrustScore's rating term is 60 of 100 for a five-star average.
    expect(
      await readContract({
        address: CONTRACTS.REPUTATION,
        abi: REPUTATION_ABI,
        functionName: "getTrustScore",
        args: [deployment.provider as `0x${string}`],
      }),
    ).toBe(BigInt(60));

    // And it must be readable by the list component's pagination.
    const page = await readContract({
      address: CONTRACTS.REPUTATION,
      abi: REPUTATION_ABI,
      functionName: "getReviews",
      args: [deployment.provider as `0x${string}`, BigInt(0), BigInt(5)],
    });
    expect(page[2][0]).toBe(5);
    expect(page[3][0]).toBe("Exactly as specified.");
  }, 60_000);

  it("passes a pending receipt and updates verification stats", async () => {
    const {
      CONTRACTS,
      VERIFIER_REGISTRY_ABI,
      WORK_RECEIPT_ABI,
      normalizeWorkReceipt,
      readContract,
    } = await import("@/lib/contracts");
    const { parseScorePercent } = await import("@/lib/review");
    const { sendTransaction, waitForTx } = await import("@/lib/tx");

    // The seeded verifier is the deployer, Hardhat account 0.
    const verifier = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    await connect(verifier);

    expect(
      await readContract({
        address: CONTRACTS.VERIFIER_REGISTRY,
        abi: VERIFIER_REGISTRY_ABI,
        functionName: "isActiveVerifier",
        args: [verifier],
      }),
      "seed should register an active verifier",
    ).toBe(true);

    // Walk ids down for a Pending receipt, exactly as /verify does.
    const next = Number(
      await readContract({
        address: CONTRACTS.WORK_RECEIPT,
        abi: WORK_RECEIPT_ABI,
        functionName: "nextReceiptId",
      }),
    );
    let pendingId = 0;
    for (let id = next - 1; id >= 1; id--) {
      const receipt = normalizeWorkReceipt(
        await readContract({
          address: CONTRACTS.WORK_RECEIPT,
          abi: WORK_RECEIPT_ABI,
          functionName: "getReceipt",
          args: [BigInt(id)],
        }),
      );
      if (receipt.status === 1) {
        pendingId = id;
        break;
      }
    }
    expect(pendingId, "seed should include a pending receipt").toBeGreaterThan(
      0,
    );

    const score = parseScorePercent("94");
    if (!score.ok) throw new Error(score.error);

    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.WORK_RECEIPT,
        data: encodeFunctionData({
          abi: WORK_RECEIPT_ABI,
          functionName: "passReceipt",
          args: [
            BigInt(pendingId),
            score.bps,
            "ipfs://verified-by-integration",
            `0x${"cd".repeat(32)}`,
          ],
        }),
      }),
    );

    const verified = normalizeWorkReceipt(
      await readContract({
        address: CONTRACTS.WORK_RECEIPT,
        abi: WORK_RECEIPT_ABI,
        functionName: "getReceipt",
        args: [BigInt(pendingId)],
      }),
    );
    expect(verified.status).toBe(2); // Passed
    expect(verified.score).toBe(BigInt(9400));
    expect(verified.verifier.toLowerCase()).toBe(verifier.toLowerCase());
    expect(verified.proofURI).toBe("ipfs://verified-by-integration");

    const stats = await readContract({
      address: CONTRACTS.WORK_RECEIPT,
      abi: WORK_RECEIPT_ABI,
      functionName: "getAgentVerificationStats",
      args: [verified.provider as `0x${string}`],
    });
    expect(stats.passedReceipts).toBe(BigInt(1));
    expect(stats.averageScore).toBe(BigInt(9400));
    expect(stats.passRate).toBe(BigInt(10000));
  }, 60_000);
});
