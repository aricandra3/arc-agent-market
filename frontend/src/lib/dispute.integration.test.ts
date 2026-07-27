/**
 * Proves the dispute wiring against a real chain, through the app's own ABI and
 * tx layer. `resolveDispute(taskId, requesterPercent)` takes a single percent —
 * an ABI entry shaped like the PRD's two-share version would compile and then
 * revert, which is exactly what unit tests cannot catch.
 *
 *   npx hardhat node                                            # terminal 1
 *   npx hardhat run scripts/seed-local.js --network localhost    # terminal 2
 *   cd frontend && ARC_INTEGRATION=1 npm test
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient, encodeFunctionData, http, parseUnits } from "viem";

const ENABLED = process.env.ARC_INTEGRATION === "1";
const DEPLOYMENT_PATH = resolve(
  import.meta.dirname,
  "../../../deployments/localhost.json",
);

/** Hardhat account 0 — the deployer, and so the escrow owner. */
const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

type Deployment = {
  rpcUrl: string;
  chainId: number;
  requester: string;
  provider: string;
  TaskEscrow: `0x${string}`;
  USDC: `0x${string}`;
};

describe.skipIf(!ENABLED)("dispute wiring", () => {
  let deployment: Deployment;

  beforeAll(() => {
    deployment = JSON.parse(
      readFileSync(DEPLOYMENT_PATH, "utf8"),
    ) as Deployment;
    process.env.NEXT_PUBLIC_ARC_RPC_URL = deployment.rpcUrl;
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID = String(deployment.chainId);
    process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS = deployment.TaskEscrow;
    process.env.NEXT_PUBLIC_USDC_ADDRESS = deployment.USDC;
  });

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

  it("disputes a submitted task and resolves it into the previewed split", async () => {
    const { CONTRACTS, ERC20_ABI, TASK_ESCROW_ABI, readContract } = await import(
      "@/lib/contracts"
    );
    const {
      splitDisputedBudget,
      validateDisputeReason,
      parseRequesterPercent,
    } = await import("@/lib/dispute");
    const { sendTransaction, waitForTx } = await import("@/lib/tx");

    const budget = parseUnits("90", 6);

    // Stand up a fresh task so the test does not depend on seed ordering.
    await connect(deployment.requester);
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.USDC,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACTS.TASK_ESCROW, budget],
        }),
      }),
    );

    const latest = await readContract({
      address: CONTRACTS.TASK_ESCROW,
      abi: TASK_ESCROW_ABI,
      functionName: "getTaskCount",
    });
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "createTask",
          args: [
            deployment.provider as `0x${string}`,
            budget,
            "integration dispute",
            ["software"],
            BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
          ],
        }),
      }),
    );
    const taskId = latest + BigInt(1);

    // Provider submits, so the task reaches the only disputable status.
    await connect(deployment.provider);
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "submitDeliverable",
          args: [taskId, `0x${"ab".repeat(32)}`, "ipfs://integration"],
        }),
      }),
    );

    // Requester disputes.
    const reason = validateDisputeReason(
      "Deliverable does not match the agreed scope.",
    );
    if (!reason.ok) throw new Error(reason.error);

    await connect(deployment.requester);
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "disputeTask",
          args: [taskId, reason.reason],
        }),
      }),
    );

    expect(
      Number(
        (
          await readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getTask",
            args: [taskId],
          })
        )[4],
      ),
      "task should be Disputed",
    ).toBe(6);

    // Owner resolves at the share the admin page previews.
    const percent = parseRequesterPercent("70");
    if (!percent.ok) throw new Error(percent.error);
    const preview = splitDisputedBudget(budget, percent.percent);

    const balanceOf = (who: string) =>
      readContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [who as `0x${string}`],
      });
    const requesterBefore = await balanceOf(deployment.requester);
    const providerBefore = await balanceOf(deployment.provider);

    await connect(OWNER);
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "resolveDispute",
          args: [taskId, BigInt(percent.percent)],
        }),
      }),
    );

    // The on-chain split must equal what the UI showed before signing.
    expect((await balanceOf(deployment.requester)) - requesterBefore).toBe(
      preview.requesterShare,
    );
    expect((await balanceOf(deployment.provider)) - providerBefore).toBe(
      preview.providerShare,
    );
    expect(preview.requesterShare + preview.providerShare).toBe(budget);

    expect(
      Number(
        (
          await readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getTask",
            args: [taskId],
          })
        )[4],
      ),
      "task should be Resolved",
    ).toBe(7);
  }, 120_000);
});
