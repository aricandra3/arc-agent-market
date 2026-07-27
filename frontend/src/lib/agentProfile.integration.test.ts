/**
 * Proves the agent-editing wiring against a real chain.
 *
 * The payoff beyond ABI shape: `updateAgent` re-indexes skills, and that fix was
 * unreachable until this page existed. Dropping a skill must actually remove the
 * agent from `getAgentsBySkill`.
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
  provider: string;
  AgentRegistry: `0x${string}`;
};

describe.skipIf(!ENABLED)("agent profile wiring", () => {
  let deployment: Deployment;

  beforeAll(() => {
    deployment = JSON.parse(
      readFileSync(DEPLOYMENT_PATH, "utf8"),
    ) as Deployment;
    process.env.NEXT_PUBLIC_ARC_RPC_URL = deployment.rpcUrl;
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID = String(deployment.chainId);
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS = deployment.AgentRegistry;
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
  }

  it("edits identity, terms, and availability, re-indexing skills", async () => {
    const { AGENT_REGISTRY_ABI, CONTRACTS, readContract } = await import(
      "@/lib/contracts"
    );
    const { formatRateInput, parseRate, parseSkills } = await import(
      "@/lib/agentProfile"
    );
    const { sendTransaction, waitForTx } = await import("@/lib/tx");
    await connect(deployment.provider);

    const agent = deployment.provider as `0x${string}`;
    const before = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [agent],
    });
    const originalSkills = [...before[2]];
    expect(originalSkills.length, "seeded agent should have skills").toBeGreaterThan(
      0,
    );

    // --- Identity ---
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.AGENT_REGISTRY,
        data: encodeFunctionData({
          abi: AGENT_REGISTRY_ABI,
          functionName: "updateProfile",
          args: ["Renamed Auditor", "Now audits with receipts."],
        }),
      }),
    );

    // --- Terms: one skill kept, one dropped, one added ---
    const keptSkill = originalSkills[0].toLowerCase();
    const droppedSkill = originalSkills[originalSkills.length - 1].toLowerCase();
    expect(droppedSkill).not.toBe(keptSkill);

    const skills = parseSkills(`${keptSkill}, fresh-skill`);
    if (!skills.ok) throw new Error(skills.error);
    const taskRate = parseRate("1.005");
    const callRate = parseRate("0.000001");
    if (!taskRate.ok || !callRate.ok) throw new Error("rates should parse");

    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.AGENT_REGISTRY,
        data: encodeFunctionData({
          abi: AGENT_REGISTRY_ABI,
          functionName: "updateAgent",
          args: [
            skills.skills,
            taskRate.value,
            callRate.value,
            "ipfs://updated-passport",
          ],
        }),
      }),
    );

    const after = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [agent],
    });

    expect(after[0]).toBe("Renamed Auditor");
    expect(after[1]).toBe("Now audits with receipts.");
    expect([...after[2]]).toEqual(skills.skills);
    // 1.005 must survive as 1005000, not the 1004999 float maths produced.
    expect(after[3]).toBe(BigInt(1_005_000));
    expect(after[4]).toBe(BigInt(1));
    expect(formatRateInput(after[3])).toBe("1.005");
    expect(after[10]).toBe("ipfs://updated-passport");

    // The re-indexing fix, now actually reachable.
    const keptIndex = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentsBySkill",
      args: [keptSkill],
    });
    const droppedIndex = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentsBySkill",
      args: [droppedSkill],
    });
    const addedIndex = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentsBySkill",
      args: ["fresh-skill"],
    });

    const has = (list: readonly string[]) =>
      list.some((entry) => entry.toLowerCase() === agent.toLowerCase());
    expect(has(keptIndex), "kept skill still matches").toBe(true);
    expect(has(addedIndex), "added skill now matches").toBe(true);
    expect(has(droppedIndex), "dropped skill must stop matching").toBe(false);

    // --- Availability ---
    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.AGENT_REGISTRY,
        data: encodeFunctionData({
          abi: AGENT_REGISTRY_ABI,
          functionName: "deactivateAgent",
        }),
      }),
    );
    expect(
      await readContract({
        address: CONTRACTS.AGENT_REGISTRY,
        abi: AGENT_REGISTRY_ABI,
        functionName: "isActive",
        args: [agent],
      }),
    ).toBe(false);

    await waitForTx(
      await sendTransaction({
        to: CONTRACTS.AGENT_REGISTRY,
        data: encodeFunctionData({
          abi: AGENT_REGISTRY_ABI,
          functionName: "reactivateAgent",
        }),
      }),
    );
    expect(
      await readContract({
        address: CONTRACTS.AGENT_REGISTRY,
        abi: AGENT_REGISTRY_ABI,
        functionName: "isActive",
        args: [agent],
      }),
    ).toBe(true);
  }, 120_000);
});
