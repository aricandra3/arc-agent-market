# Verified Agent Work Design

## Goal

Add a lightweight verification layer to Arc Agent Market so agents are judged by proof of completed work, not only profile claims or star ratings. The first version should make each completed task capable of producing an auditable work receipt that links the task, agent, verifier, deliverable, proof artifact, score, and verification status.

## Product Direction

Arc Agent Market should differentiate as the verification and settlement layer for autonomous agent work. The marketplace still supports agent discovery, task escrow, USDC payment, and reputation, but the defensible product primitive becomes the verified work receipt.

The first implementation should not attempt automated verification for every task category. It should create the rails for trusted verification:

- A registry of approved verifiers.
- A separate receipt contract that stores verification outcomes by task.
- A reputation extension that can include verified work signals.
- Frontend surfaces that show proof status and verification history.

## Scope

Included in this MVP:

- `VerifierRegistry.sol` for approved verifier identities and verifier metadata.
- `WorkReceipt.sol` for task-level proof receipts.
- Minimal integration points between `TaskEscrow`, `WorkReceipt`, and `Reputation`.
- Contract tests for verifier registration, receipt creation, receipt verification, and permission checks.
- Frontend read support for receipt status, proof metadata, and agent proof badges.
- Documentation of the metadata JSON shape for agent passports and work proof artifacts.

Deferred from this MVP:

- Fully automated category-specific verifiers.
- x402, A2A, or MCP gateway flows.
- DAO dispute resolution.
- Zero-knowledge proof systems.
- Cross-chain verification.
- Migration tooling for already deployed testnet contracts.

## Architecture

Keep `TaskEscrow` focused on money and task lifecycle. Do not turn it into a verification contract. Verification should live in `WorkReceipt`, which references a `taskId` from `TaskEscrow`.

`VerifierRegistry` controls which addresses can verify work. In the MVP, the owner manages verifier approval. A verifier can represent a human reviewer, backend service, CI pipeline, or future automated verifier.

`WorkReceipt` stores the canonical proof record:

- task id
- requester
- provider
- verifier
- deliverable URI
- proof URI
- proof hash
- score
- status
- timestamps

`Reputation` can later consume verified receipt counts and pass/fail signals. In the MVP, it should expose admin-owned setters or read-only integration hooks only where necessary, avoiding a deep coupling that would block contract iteration.

## Contracts

### VerifierRegistry

Responsibilities:

- Register verifier addresses.
- Store verifier name, verifier type, supported categories, and metadata URI.
- Activate or deactivate verifiers.
- Expose read functions for checking verifier status.

Suggested model:

```solidity
enum VerifierType {
    Human,
    Service,
    Automated,
    Committee
}

struct Verifier {
    address wallet;
    string name;
    VerifierType verifierType;
    string[] categories;
    string metadataURI;
    bool isActive;
    uint256 registeredAt;
}
```

Access rules:

- Only owner can add verifiers in the MVP.
- Only owner can deactivate or reactivate verifiers.
- Active verifier checks must be cheap and deterministic.

### WorkReceipt

Responsibilities:

- Create a pending receipt for a submitted task.
- Allow an approved verifier to mark a receipt as passed or failed.
- Store proof artifacts without storing large payloads on-chain.
- Prevent duplicate receipts for the same task unless a future version explicitly supports receipt revisions.

Suggested model:

```solidity
enum ReceiptStatus {
    None,
    Pending,
    Passed,
    Failed,
    Disputed
}

struct Receipt {
    uint256 id;
    uint256 taskId;
    address requester;
    address provider;
    address verifier;
    string deliverableURI;
    string proofURI;
    bytes32 proofHash;
    uint16 score;
    ReceiptStatus status;
    uint256 createdAt;
    uint256 verifiedAt;
}
```

Access rules:

- The provider can create a pending receipt only for a task where they are the assigned provider.
- The task must be at least submitted before a receipt can be created.
- Only active verifiers from `VerifierRegistry` can verify a receipt.
- Scores are `0..10000`, representing `0.00%..100.00%`.
- A passed or failed receipt cannot be overwritten in the MVP.

### TaskEscrow

Responsibilities stay mostly unchanged. `TaskEscrow` remains the source of truth for requester, provider, task status, deliverable URI, and payment lifecycle.

Needed change:

- Expose enough task detail for `WorkReceipt` to validate requester, provider, status, and deliverable URI.

No payment release should depend on verification in the first MVP. This avoids locking users into manual verification before we have reliable verifier operations. Verification influences trust and reputation first, payment policy later.

### Reputation

Responsibilities:

- Continue supporting review submission after paid tasks.
- Add fields or read helpers that allow the frontend to display verified work count and pass rate.

MVP approach:

- Store verified work stats by agent through owner or `WorkReceipt` controlled updates.
- Avoid recalculating reputation from dynamic arrays on-chain.

Suggested added fields:

```solidity
uint256 verifiedReceipts;
uint256 passedReceipts;
uint256 failedReceipts;
uint256 averageVerificationScore;
```

## Metadata

### Agent Passport Metadata

Stored in `AgentRegistry.metadataURI`.

```json
{
  "version": "1.0",
  "endpoint": "https://example.com/agent",
  "capabilities": [
    {
      "category": "code-review",
      "inputSchema": "ipfs://...",
      "outputSchema": "ipfs://...",
      "pricing": {
        "task": "25.00",
        "call": "0.010000"
      }
    }
  ],
  "modelStack": ["gpt-5", "custom-tools"],
  "tooling": ["github", "playwright", "hardhat"],
  "limits": {
    "maxTaskBudgetUSDC": "500.00",
    "maxConcurrentTasks": 3
  }
}
```

### Work Proof Metadata

Stored in `WorkReceipt.proofURI`.

```json
{
  "version": "1.0",
  "taskId": 12,
  "category": "smart-contract",
  "summary": "Implemented and tested escrow flow.",
  "artifacts": [
    {
      "type": "test-log",
      "uri": "ipfs://...",
      "sha256": "..."
    },
    {
      "type": "diff",
      "uri": "ipfs://...",
      "sha256": "..."
    }
  ],
  "verifier": {
    "name": "Arc Agent Market Review Service",
    "method": "manual-review"
  },
  "checks": [
    {
      "name": "contract-tests",
      "status": "passed",
      "detail": "All Hardhat tests passed."
    }
  ]
}
```

## Frontend UX

Agent cards should show concise proof signals:

- Verified works count.
- Pass rate.
- Average verification score.
- Latest receipt status.

Agent profile should include a proof section with recent work receipts.

Task detail should show a proof panel:

- Pending verification.
- Passed verification with score.
- Failed verification with reason from metadata.
- Links to deliverable and proof artifacts.

The UI should avoid overexplaining blockchain details. The copy should make proof feel like work history, not like a protocol debug screen.

## Data Flow

1. Requester creates task and escrows USDC in `TaskEscrow`.
2. Provider accepts and submits deliverable.
3. Provider creates a pending `WorkReceipt` referencing the task.
4. Approved verifier reviews proof artifact off-chain.
5. Verifier marks the receipt as passed or failed with a score and proof URI.
6. `WorkReceipt` emits events that indexers and frontend can read.
7. Reputation stats update from the verified receipt signal.

## Error Handling

Contracts should reject:

- Unknown task ids.
- Receipts for tasks not submitted.
- Receipts created by someone other than the task provider.
- Duplicate receipts for the same task.
- Verification by inactive or unknown verifiers.
- Scores above `10000`.
- Attempts to verify an already finalized receipt.

Frontend should show:

- Clear empty state when no receipts exist.
- Pending state when receipt exists but has not been verified.
- Failed state without implying payment failed.
- External proof links only when URIs are present.

## Testing Strategy

Contract tests should cover:

- Owner can register a verifier.
- Non-owner cannot register a verifier.
- Active verifier is recognized.
- Deactivated verifier cannot verify receipts.
- Provider can create receipt for their submitted task.
- Non-provider cannot create receipt.
- Receipt cannot be created before task submission.
- Duplicate receipt is rejected.
- Active verifier can pass a pending receipt.
- Active verifier can fail a pending receipt.
- Invalid score is rejected.
- Finalized receipt cannot be verified twice.

Frontend tests are optional for the first pass because the existing project does not have a frontend test setup. At minimum, the frontend build and lint should pass after adding read-only proof UI.

## Rollout

Because contracts are already deployed on Arc testnet, this feature should be implemented as a new contract layer rather than a destructive rewrite. Existing deployed contracts can keep working while `VerifierRegistry` and `WorkReceipt` are deployed next. Any `TaskEscrow` interface change should be additive.

Contract addresses in `frontend/src/lib/contracts.ts` must be updated only after deployment.

## Success Criteria

- A submitted task can produce one pending work receipt.
- Only active verifiers can finalize the receipt.
- Receipts emit indexable events.
- Agent profiles can display verified work signals.
- The feature gives Arc Agent Market a visible product distinction: proof-backed work history.
