# Verified Agent Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proof-backed work receipt layer so submitted tasks can be verified by approved verifiers and surfaced in the frontend as verified work history.

**Architecture:** Add `VerifierRegistry` for verifier identity and `WorkReceipt` for task proof records. Keep `TaskEscrow` focused on escrow and task state; `WorkReceipt` reads `TaskEscrow.getTask()` and stores receipt plus per-agent verification stats. The frontend reads `WorkReceipt` stats and receipt status without requiring a redeploy of existing escrow logic beyond deploying new contracts.

**Tech Stack:** Solidity 0.8.24, Hardhat, OpenZeppelin Ownable/ReentrancyGuard, Next.js App Router, viem contract reads.

---

## Files

- Create: `contracts/VerifierRegistry.sol`
- Create: `contracts/WorkReceipt.sol`
- Create: `contracts/mocks/MockUSDC.sol`
- Create: `test/verified-work.test.js`
- Modify: `package.json`
- Modify: `scripts/deploy.js`
- Modify: `frontend/src/lib/contracts.ts`
- Modify: `frontend/src/components/AgentCard.tsx`
- Modify: `frontend/src/app/agents/page.tsx`
- Modify: `frontend/src/app/agents/[id]/page.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/app/tasks/[id]/page.tsx`

## Task 1: Contract Test Harness

**Files:**
- Create: `contracts/mocks/MockUSDC.sol`
- Create: `test/verified-work.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `test/verified-work.test.js` with tests for:

- owner registers a verifier
- non-owner cannot register a verifier
- provider creates a pending receipt only after task submission
- non-provider cannot create a receipt
- duplicate receipt is rejected
- inactive verifier cannot verify a receipt
- active verifier passes a receipt and updates agent stats
- finalized receipt cannot be verified twice

- [ ] **Step 2: Run tests to verify RED**

Run: `npx hardhat test test/verified-work.test.js`

Expected: fail because `VerifierRegistry`, `WorkReceipt`, and `MockUSDC` do not exist.

- [ ] **Step 3: Add test-only ERC20**

Create `contracts/mocks/MockUSDC.sol` as a simple mintable ERC20 with 6 decimals.

- [ ] **Step 4: Update test script**

Set root `package.json` script `"test": "hardhat test"`.

## Task 2: Verifier Registry Contract

**Files:**
- Create: `contracts/VerifierRegistry.sol`
- Test: `test/verified-work.test.js`

- [ ] **Step 1: Implement minimal registry**

Create a contract with:

- `enum VerifierType { Human, Service, Automated, Committee }`
- `struct Verifier`
- `registerVerifier(address wallet, string name, VerifierType verifierType, string[] categories, string metadataURI)`
- `deactivateVerifier(address wallet)`
- `reactivateVerifier(address wallet)`
- `isActiveVerifier(address wallet)`
- `getVerifier(address wallet)`

- [ ] **Step 2: Run registry tests**

Run: `npx hardhat test test/verified-work.test.js`

Expected: registry tests pass, receipt tests still fail.

## Task 3: Work Receipt Contract

**Files:**
- Create: `contracts/WorkReceipt.sol`
- Test: `test/verified-work.test.js`

- [ ] **Step 1: Implement task-reading interfaces**

Add interfaces for:

- `ITaskEscrow.getTask(uint256)`
- `IVerifierRegistry.isActiveVerifier(address)`

- [ ] **Step 2: Implement receipt creation**

Create `createReceipt(uint256 taskId, string proofURI, bytes32 proofHash)` that:

- reads requester, provider, status, and deliverable URI from `TaskEscrow`
- rejects unknown tasks
- requires `msg.sender == provider`
- requires task status `Submitted`
- rejects duplicate task receipt
- stores a pending receipt

- [ ] **Step 3: Implement verification**

Create:

- `passReceipt(uint256 receiptId, uint16 score, string proofURI, bytes32 proofHash)`
- `failReceipt(uint256 receiptId, uint16 score, string proofURI, bytes32 proofHash)`

Both functions require an active verifier, score <= 10000, and pending status.

- [ ] **Step 4: Implement read helpers**

Expose:

- `getReceipt(uint256 receiptId)`
- `getReceiptByTask(uint256 taskId)`
- `getAgentReceipts(address agent)`
- `getAgentVerificationStats(address agent)`

- [ ] **Step 5: Run receipt tests**

Run: `npx hardhat test test/verified-work.test.js`

Expected: all contract tests pass.

## Task 4: Deployment Script

**Files:**
- Modify: `scripts/deploy.js`

- [ ] **Step 1: Add deployments**

Deploy `VerifierRegistry` and `WorkReceipt` after `Reputation`.

- [ ] **Step 2: Print addresses**

Add both addresses to the deployment summary.

- [ ] **Step 3: Compile**

Run: `npx hardhat compile`

Expected: compile succeeds.

## Task 5: Frontend Contract Read Layer

**Files:**
- Modify: `frontend/src/lib/contracts.ts`

- [ ] **Step 1: Add contract address placeholder**

Add `VERIFIER_REGISTRY` and `WORK_RECEIPT` address entries.

- [ ] **Step 2: Add ABIs**

Add minimal ABI entries for:

- `getReceiptByTask`
- `getAgentVerificationStats`
- `getAgentReceipts`
- `getReceipt`
- receipt events if needed later

- [ ] **Step 3: Add helpers**

Add:

- `RECEIPT_STATUS`
- `formatPercentBps(score)`
- `hasConfiguredWorkReceipt()`

## Task 6: Agent Proof Signals

**Files:**
- Modify: `frontend/src/components/AgentCard.tsx`
- Modify: `frontend/src/app/agents/page.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Load stats**

When agents are loaded, read `getAgentVerificationStats(agentAddress)` if `WORK_RECEIPT` is configured.

- [ ] **Step 2: Render badge**

Show verified receipt count, pass rate, and average verification score when data exists.

- [ ] **Step 3: Keep graceful fallback**

If the contract address is unset or read fails, show the existing UI without proof stats.

## Task 7: Task Proof Panel

**Files:**
- Modify: `frontend/src/app/tasks/[id]/page.tsx`

- [ ] **Step 1: Load receipt by task**

Read `getReceiptByTask(taskId)` if `WORK_RECEIPT` is configured.

- [ ] **Step 2: Render proof panel**

Show:

- no receipt state
- pending state
- passed state with score
- failed state with score
- proof URI link when present

- [ ] **Step 3: Build frontend**

Run: `npm run build` in `frontend`.

Expected: build succeeds.

## Task 8: Verification

**Files:**
- All touched files

- [ ] **Step 1: Run contract tests**

Run: `npm test`

Expected: all Hardhat tests pass.

- [ ] **Step 2: Run contract compile**

Run: `npx hardhat compile`

Expected: compile succeeds.

- [ ] **Step 3: Run frontend lint**

Run: `npm run lint` in `frontend`.

Expected: lint succeeds or reports only pre-existing issues. New proof UI should not introduce lint errors.

- [ ] **Step 4: Run frontend build**

Run: `npm run build` in `frontend`.

Expected: build succeeds.

## Self-Review

Spec coverage:

- Verifier registry is covered in Task 2.
- Work receipts are covered in Task 3.
- Deployment is covered in Task 4.
- Frontend proof badges and proof panel are covered in Tasks 5 through 7.
- Verification commands are covered in Task 8.

Scope note:

- `Reputation.sol` deep integration is intentionally deferred. The MVP exposes verification stats directly from `WorkReceipt`, which keeps the first implementation smaller and avoids coupling reputation calculations to a newly deployed proof layer.
