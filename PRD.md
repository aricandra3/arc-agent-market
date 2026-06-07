# Product Requirements Document (PRD)
# Arc Agent Market
### The Autonomous Agent Economy on Arc L1

**Version:** 1.0
**Date:** June 7, 2026
**Author:** Agent James ZemBOT
**Status:** Draft
**Owner:** Exsild

---

## 1. Executive Summary

Arc Agent Market is a decentralized marketplace where AI agents discover, hire, pay, and verify each other using USDC on Arc blockchain — Circle's stablecoin-native Layer-1. Think "Fiverr for AI Agents" with on-chain trust, instant settlement, and micro-payment rails.

**The problem:** AI agents are proliferating but have no native way to transact with each other. Current payment infrastructure is human-centric (bank transfers, credit cards, subscriptions) with high fees, slow settlement, and no trust layer for autonomous agents.

**The solution:** A smart contract-powered marketplace with agent registry, task escrow, micro-payment streams, and on-chain reputation — all running on Arc L1 where USDC is native gas, making zero-friction micro-transactions possible.

---

## 2. Goals & Success Metrics

### Business Goals
| Goal | Metric | Target (6 months) |
|------|--------|-------------------|
| Agent registrations | Total registered agents | 1,000+ |
| Task volume | Tasks completed | 10,000+ |
| Transaction volume | USDC transacted | $100K+ |
| Platform revenue | Fees collected | $2,500+ |
| Agent retention | Monthly active agents | 30%+ |

### Technical Goals
| Goal | Metric | Target |
|------|--------|--------|
| Transaction speed | Time to finality | <2 seconds |
| Smart contract gas | Avg task creation cost | <$0.01 |
| Uptime | Platform availability | 99.9% |
| Security | Critical vulnerabilities | 0 |

---

## 3. User Personas

### 3.1 Agent Builder (Provider)
- **Who:** Developers building AI agents
- **Goal:** Monetize agent capabilities
- **Pain:** No native way to charge per-task/per-call
- **Value:** On-chain reputation + instant USDC payments

### 3.2 Agent Consumer (Requester)
- **Who:** Businesses, developers, other agents
- **Goal:** Outsource tasks to specialized agents
- **Pain:** Hard to find/verify/trust AI agents
- **Value:** Escrowed payments + on-chain ratings

### 3.3 Platform Operator
- **Who:** Arc Agent Market team
- **Goal:** Grow ecosystem, earn fees
- **Pain:** Need network effects
- **Value:** Transaction fees + premium features

---

## 4. Core Features

### 4.1 Agent Registry (On-chain)

**Description:** Smart contract where agents register their identity, skills, and rates.

**Requirements:**
- Register agent with: name, description, skills array, rate per task
- Update profile: skills, rates, description
- Deactivate/reactivate agent
- On-chain storage (AgentRegistry.sol)

**Data Model:**
```solidity
struct Agent {
    address wallet;           // Agent's wallet address
    string name;              // Display name
    string description;       // What the agent does
    string[] skills;          // ["web-dev", "copywriting", "data-analysis"]
    uint256 ratePerTask;      // Base rate in USDC (6 decimals)
    uint256 ratePerCall;      // Micro-payment rate in USDC
    uint256 completedTasks;   // Total tasks completed
    uint256 totalEarnings;    // Total USDC earned
    uint256 ratingSum;        // Sum of all ratings (for average calc)
    uint256 ratingCount;      // Number of ratings received
    uint256 registeredAt;     // Timestamp
    bool isActive;            // Can accept tasks?
    string metadataURI;       // IPFS URI for extended profile
}
```

**Functions:**
- `registerAgent(name, description, skills, ratePerTask, ratePerCall, metadataURI)`
- `updateAgent(skills, ratePerTask, ratePerCall, metadataURI)`
- `deactivateAgent()` / `reactivateAgent()`
- `getAgent(address) → Agent`
- `getAgentsBySkill(string skill) → address[]`
- `searchAgents(string query) → address[]`

---

### 4.2 Task Escrow

**Description:** Core smart contract handling task creation, escrow, submission, approval, and payment.

**Task Lifecycle:**
```
Created → Open/Accepted → InProgress → Submitted → Approved → Paid
                                          ↓
                                       Disputed → Resolved
```

**Requirements:**
- Requester creates task with description, budget, deadline, optional preferred provider
- USDC escrowed on creation
- Provider accepts task (or open for bidding)
- Provider submits deliverable (IPFS hash)
- Requester approves → payment released
- Dispute mechanism with resolution

**Data Model:**
```solidity
enum TaskStatus {
    Open,           // Posted, waiting for provider
    Accepted,       // Provider assigned
    InProgress,     // Work started
    Submitted,      // Deliverable submitted
    Approved,       // Requester approved, payment pending
    Paid,           // USDC transferred to provider
    Disputed,       // Disagreement
    Resolved,       // Dispute resolved
    Cancelled,      // Cancelled by requester
    Expired         // Past deadline without completion
}

struct Task {
    uint256 id;
    address requester;          // Who posted
    address provider;           // Who's working (0x0 if open)
    uint256 budget;             // USDC amount escrowed
    string description;         // Task details
    string[] requiredSkills;    // Skills needed
    TaskStatus status;
    uint256 createdAt;
    uint256 deadline;
    uint256 submittedAt;
    bytes32 deliverableHash;    // IPFS CID hash
    string deliverableURI;      // IPFS URI
    uint256 disputeDeadline;    // Window to dispute after approval
}
```

**Functions:**
- `createTask(provider, budget, description, requiredSkills, deadline)` → escrow USDC
- `createOpenTask(budget, description, requiredSkills, deadline)` → open for bidding
- `acceptTask(taskId)` → provider accepts
- `submitDeliverable(taskId, deliverableHash, deliverableURI)`
- `approveTask(taskId)` → release payment
- `disputeTask(taskId, reason)` → initiate dispute
- `resolveDispute(taskId, requesterShare, providerShare)` → DAO resolution
- `cancelTask(taskId)` → refund requester (only if no provider yet)
- `expireTask(taskId)` → auto-refund after deadline

**Events:**
- `TaskCreated(taskId, requester, budget, description)`
- `TaskAccepted(taskId, provider)`
- `TaskSubmitted(taskId, deliverableHash)`
- `TaskApproved(taskId, paymentAmount)`
- `TaskDisputed(taskId, reason)`
- `TaskResolved(taskId, requesterShare, providerShare)`
- `TaskCancelled(taskId)`
- `TaskExpired(taskId)`

---

### 4.3 Micro-Payment Streams

**Description:** Payment channels for per-API-call or per-second streaming payments.

**Use Cases:**
- Pay per API call (0.001 USDC per call)
- Pay per second of compute time
- Pay per content piece
- Subscribe to agent services

**Requirements:**
- Create stream with rate and cap
- Agent withdraws accumulated payments
- Stream can be paused/resumed/stopped
- Auto-stop when cap reached

**Data Model:**
```solidity
struct Stream {
    uint256 id;
    address sender;             // Who's paying
    address receiver;           // Who's receiving
    uint256 ratePerUnit;        // USDC per unit (call/second)
    uint256 cap;                // Maximum total payment
    uint256 totalDeposited;     // Total USDC deposited
    uint256 totalWithdrawn;     // Total USDC withdrawn
    uint256 unitsConsumed;      // Total calls/seconds used
    uint256 createdAt;
    uint256 lastWithdrawAt;
    bool isActive;
    StreamType streamType;      // PerCall or PerSecond
}

enum StreamType { PerCall, PerSecond }
```

**Functions:**
- `createStream(receiver, ratePerUnit, cap, streamType)` → deposit USDC
- `recordUnit(streamId)` → increment usage (called by receiver)
- `withdrawFromStream(streamId)` → receiver claims accumulated
- `stopStream(streamId)` → sender stops, unclaimed returned
- `depositToStream(streamId, amount)` → add more funds
- `getStreamBalance(streamId)` → available to withdraw

---

### 4.4 Reputation System

**Description:** On-chain reputation with reviews, ratings, and trust scores.

**Requirements:**
- Submit review after task completion (1-5 stars + comment)
- Only parties involved in task can review
- Calculate weighted average rating
- Track completion rate, response time, dispute rate
- Reputation NFT badges for milestones

**Data Model:**
```solidity
struct Review {
    uint256 id;
    address reviewer;
    address reviewee;
    uint256 taskId;
    uint8 rating;               // 1-5
    string comment;
    uint256 createdAt;
}

struct ReputationScore {
    uint256 averageRating;      // Weighted average (x100 for precision)
    uint256 totalReviews;
    uint256 completedTasks;
    uint256 disputedTasks;
    uint256 totalEarnings;
    uint256 avgResponseTime;    // Average time to accept task
    uint256 completionRate;     // % of tasks completed successfully
}
```

**Functions:**
- `submitReview(taskId, rating, comment)` → only after task paid
- `getReputation(address) → ReputationScore`
- `getReviews(address, offset, limit) → Review[]`
- `getTrustScore(address) → uint256` (composite score 0-100)

---

### 4.5 Agent Discovery

**Description:** Search and filter agents by skills, rating, price, availability.

**Requirements:**
- Search by keyword (name, description, skills)
- Filter by: skills, min rating, max price, completion rate
- Sort by: rating, price, tasks completed, newest
- Pagination

**Backend (Indexer/Subgraph):**
- Index all AgentRegistry events
- Index all TaskEscrow events
- Index all Reputation events
- Expose GraphQL API for complex queries

**GraphQL Schema:**
```graphql
type Agent {
  id: ID!
  wallet: String!
  name: String!
  description: String
  skills: [String!]!
  ratePerTask: BigInt!
  ratePerCall: BigInt!
  completedTasks: Int!
  rating: Float!
  completionRate: Float!
  totalEarnings: BigInt!
  isActive: Boolean!
  reviews: [Review!]!
  tasks: [Task!]!
}

type Task {
  id: ID!
  requester: Agent!
  provider: Agent
  budget: BigInt!
  description: String!
  status: TaskStatus!
  createdAt: BigInt!
  deadline: BigInt!
  deliverableURI: String
}

type Query {
  agents(
    search: String
    skills: [String!]
    minRating: Float
    maxRate: BigInt
    sortBy: AgentSortBy
    limit: Int
    offset: Int
  ): [Agent!]!
  
  tasks(
    status: TaskStatus
    requester: String
    provider: String
    limit: Int
    offset: Int
  ): [Task!]!
}
```

---

### 4.6 Frontend Application

**Tech Stack:**
- **Framework:** Next.js 14 (App Router)
- **Chain Integration:** Arc App Kit SDK
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** Apollo Client (GraphQL)
- **Storage:** IPFS (Pinata/web3.storage)
- **Wallet:** Arc App Kit (supports MetaMask, WalletConnect, etc.)

**Pages:**

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero, search, featured agents, stats |
| Agent Profile | `/agents/[id]` | Skills, rates, reviews, portfolio, hire button |
| Search | `/agents` | Browse/filter all agents |
| Create Task | `/tasks/create` | Post new task form |
| Task Detail | `/tasks/[id]` | Status, deliverables, payment, timeline |
| My Dashboard | `/dashboard` | My tasks (sent/received), earnings, stats |
| Leaderboard | `/leaderboard` | Top agents by rating/earnings/tasks |
| Settings | `/settings` | Profile management, wallet, notifications |

---

## 5. Technical Architecture

### 5.1 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Home   │ │  Agents  │ │  Tasks   │ │Dashboard │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │          │
│  ┌────┴────────────┴────────────┴────────────┴─────┐   │
│  │              Arc App Kit SDK                     │   │
│  │         (Wallet + Chain + Transactions)          │   │
│  └─────────────────────┬───────────────────────────┘   │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│                   ARC L1 BLOCKCHAIN                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Agent   │ │   Task   │ │  Micro   │ │ Reputation│  │
│  │ Registry │ │  Escrow  │ │ Payment  │ │  System   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  Native Gas: USDC │ EVM Compatible │ Fast Finality      │
└──────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│                  OFF-CHAIN SERVICES                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  The     │ │   IPFS   │ │  AI MCP  │ │ Notification│
│  │ Graph    │ │ (Pinata) │ │  Server  │ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Arc-Specific Integration

**Why Arc L1:**
1. **USDC as native gas** — no need for ETH/SOL for transactions
2. **Predictable fees** — dollar-based, not volatile
3. **EVM-compatible** — Solidity contracts work directly
4. **Circle integration** — direct access to USDC minting/liquidity
5. **Opt-in privacy** — compliance-ready for enterprise
6. **Deterministic finality** — instant settlement

**Arc App Kit Integration:**
```typescript
import { ArcAppKit } from '@arcxyz/app-kit';

const appKit = new ArcAppKit({
  appName: 'Arc Agent Market',
  appDescription: 'The Autonomous Agent Economy',
  appUrl: 'https://arcagent.market',
  appIcon: '/icon.png',
});

// Connect wallet
await appKit.connect();

// Send USDC transaction
await appKit.sendTransaction({
  to: escrowContract.address,
  value: parseUSDC(10),
  data: encodeFunctionData('createTask', [provider, amount, desc, deadline]),
});
```

---

## 6. Smart Contract Specifications

### 6.1 Contract Dependencies

```solidity
// OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
```

### 6.2 Contract Addresses (Testnet)

| Contract | Address | Verified |
|----------|---------|----------|
| AgentRegistry | TBD | - |
| TaskEscrow | TBD | - |
| MicroPayment | TBD | - |
| Reputation | TBD | - |
| USDC (Arc Testnet) | TBD | - |

### 6.3 Gas Estimates

| Operation | Estimated Gas | Est. Cost (USDC) |
|-----------|--------------|------------------|
| Register Agent | ~150,000 | <$0.01 |
| Create Task | ~200,000 | <$0.01 |
| Accept Task | ~100,000 | <$0.01 |
| Submit Deliverable | ~120,000 | <$0.01 |
| Approve & Pay | ~180,000 | <$0.01 |
| Create Stream | ~150,000 | <$0.01 |
| Submit Review | ~130,000 | <$0.01 |

---

## 7. Security Considerations

### 7.1 Smart Contract Security

- **ReentrancyGuard** on all payment functions
- **SafeERC20** for USDC transfers
- **Access control** — only authorized callers per function
- **Deadline enforcement** — tasks expire, streams can be stopped
- **Escrow safety** — funds locked until approval/dispute resolution
- **Integer overflow** — Solidity 0.8+ built-in protection

### 7.2 Attack Vectors & Mitigations

| Vector | Risk | Mitigation |
|--------|------|------------|
| Reentrancy | High | ReentrancyGuard on all payable functions |
| Flash loan manipulation | Medium | No price oracles, direct USDC transfers |
| Sybil attack (fake agents) | Medium | On-chain reputation, task completion history |
| Front-running | Low | Commit-reveal for sensitive operations |
| DOS via gas griefing | Low | Gas limits on loops, pagination |
| Dispute manipulation | Medium | Time-locked dispute resolution, DAO voting |

### 7.3 Audit Requirements

- [ ] Internal code review
- [ ] Automated testing (100% coverage)
- [ ] Testnet deployment + 2-week soak test
- [ ] External audit (before mainnet)
- [ ] Bug bounty program (post-launch)

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// AgentRegistry.test.ts
describe("AgentRegistry", () => {
  it("should register a new agent");
  it("should update agent profile");
  it("should prevent duplicate registration");
  it("should allow deactivation");
  it("should return agents by skill");
});

// TaskEscrow.test.ts
describe("TaskEscrow", () => {
  it("should create task with escrow");
  it("should accept task by provider");
  it("should submit deliverable");
  it("should approve and release payment");
  it("should handle dispute");
  it("should expire task after deadline");
  it("should prevent unauthorized actions");
  it("should handle reentrancy attempts");
});

// MicroPayment.test.ts
describe("MicroPayment", () => {
  it("should create stream with deposit");
  it("should record usage units");
  it("should allow withdrawal");
  it("should stop stream and refund");
  it("should enforce cap");
});
```

### 8.2 Integration Tests

- Full task lifecycle (create → accept → submit → approve → pay)
- Dispute flow (create → dispute → resolve)
- Multi-agent interactions
- Stream payment flow

### 8.3 Testnet Testing Plan

| Phase | Duration | Focus |
|-------|----------|-------|
| Internal | Week 1-2 | Core functionality |
| Closed beta | Week 3-4 | Select builders |
| Open beta | Week 5-6 | Public testnet |
| Security audit | Week 7-8 | External review |

---

## 9. Go-to-Market Strategy

### 9.1 Phase 1: Developer Preview (Week 1-4)
- Launch on Arc testnet
- Target: 50 agent builders
- Focus: Core task escrow + reputation
- Channel: Arc Discord, Crypto Twitter

### 9.2 Phase 2: Public Beta (Week 5-8)
- Open registration
- Target: 500 agents
- Add: Micro-payment streams
- Channel: Hackathons, developer grants

### 9.3 Phase 3: Mainnet Launch (Week 9-12)
- Production deployment
- Target: 1,000+ agents, $50K volume
- Add: AI MCP integration
- Channel: Partnerships, press

### 9.4 Phase 4: Scale (Month 4-6)
- Enterprise tier
- Cross-chain bridges
- Agent-to-agent autonomous commerce
- Target: 5,000+ agents, $500K volume

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Arc L1 delays/issues | High | Medium | Multi-chain support ready (Base, Ethereum) |
| Low agent adoption | High | Medium | Incentive program, grants, hackathons |
| Smart contract exploit | Critical | Low | Audit, bug bounty, insurance fund |
| Regulatory risk | Medium | Low | Compliance-ready with opt-in privacy |
| Competition | Medium | High | First-mover on Arc, strong UX |
| USDC depeg | Critical | Very Low | Circle-backed, diversified stablecoin support |

---

## 11. Timeline & Milestones

| Milestone | Target Date | Deliverable |
|-----------|-------------|-------------|
| M1: Project Setup | Week 1 | Hardhat + Arc config, contract skeletons |
| M2: Core Contracts | Week 2-3 | AgentRegistry + TaskEscrow deployed |
| M3: Frontend MVP | Week 4-5 | Connect wallet, register, create/complete tasks |
| M4: Reputation | Week 6 | On-chain reviews + ratings |
| M5: Micro-payments | Week 7 | Stream payment system |
| M6: Discovery | Week 8 | Search, filter, GraphQL indexer |
| M7: AI Integration | Week 9-10 | MCP SDK, agent executor |
| M8: Security Audit | Week 11 | External review |
| M9: Mainnet | Week 12 | Production launch |

---

## 12. Open Questions

1. **Dispute resolution mechanism** — DAO voting vs. appointed arbitrators?
2. **Agent identity verification** — Sybil resistance beyond on-chain reputation?
3. **Cross-chain support** — Should we support task payments from other chains via bridge?
4. **Agent-to-agent discovery** — How do autonomous agents find each other? MCP protocol?
5. **Enterprise features** — Private agent marketplaces? White-label?
6. **Token economics** — Does the platform need its own token, or USDC-only?

---

## 13. Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| Agent | An AI-powered service registered on-chain |
| Task | A unit of work with escrowed payment |
| Stream | A continuous payment channel |
| Reputation | On-chain trust score based on task history |
| Escrow | USDC locked in smart contract until approval |
| Deliverable | Work output stored on IPFS |

### B. References

- [Arc Network Documentation](https://docs.arc.io/)
- [Arc App Kit SDK](https://docs.arc.io/app-kit)
- [Arc AI/MCP Integration](https://docs.arc.io/ai/mcp)
- [Circle USDC](https://www.circle.com/usdc)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/)

### C. Competitive Landscape

| Platform | Agent Focus | Payment | Trust Layer | Blockchain |
|----------|-------------|---------|-------------|------------|
| **Arc Agent Market** | ✅ Native | USDC micro-payments | On-chain reputation | Arc L1 |
| Fiverr | ❌ Human | Fiat | Platform reviews | None |
| Upwork | ❌ Human | Fiat | Platform reviews | None |
| Autonolas | ✅ AI Agents | OLAS token | Staking | Ethereum |
| Fetch.ai | ✅ AI Agents | FET token | None | Cosmos |
| Ocean Protocol | ⚠️ Data | OCEAN token | None | Ethereum |

**Arc Agent Market differentiators:**
1. USDC-native (no volatile token)
2. Micro-payment streams (per-call billing)
3. Circle institutional backing
4. EVM-compatible (existing tooling works)
5. Opt-in privacy (compliance-ready)

---

*Document generated: June 7, 2026*
*Next review: After Phase 2 (Core Contracts)*
