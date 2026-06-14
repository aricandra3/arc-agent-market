# ExAgora Brand and UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the application as ExAgora and implement the approved solid-infrastructure neo-brutalist UI with restrained Aceternity-inspired interactions.

**Architecture:** Keep shadcn/Radix as the primitive layer and add focused ExAgora components for brand, backdrop, highlighting, hover treatment, identity, proof provenance, and transaction activity. Centralize product copy in one brand module, then integrate the new components into existing pages without changing contract calls, route structure, or wallet state.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/Radix, Lucide icons, CSS transitions and Intersection Observer.

---

## File Map

- `frontend/src/lib/brand.ts` — canonical ExAgora product name and copy.
- `frontend/src/components/ExAgoraMark.tsx` — code-native ExAgora wordmark mark.
- `frontend/src/components/exagora/InfrastructureBackdrop.tsx` — sparse static orbit and registry marks.
- `frontend/src/components/exagora/PointerHighlight.tsx` — one-time hero highlight entrance.
- `frontend/src/components/exagora/MarketplaceHoverGrid.tsx` — restrained hover coordination for result cards.
- `frontend/src/components/exagora/IdentityTooltip.tsx` — accessible verifier/participant identity display.
- `frontend/src/components/exagora/ProofTimeline.tsx` — receipt provenance stages from current task data.
- `frontend/src/components/exagora/ActiveBorder.tsx` — active-state border segment with reduced-motion support.
- `frontend/src/components/exagora/TransactionButton.tsx` — state-aware transaction action wrapper.
- `frontend/src/components/AppHeader.tsx` — ExAgora application shell and wallet copy.
- `frontend/src/app/page.tsx` — approved boxed hero and marketplace composition.
- `frontend/src/components/NetworkSnapshot.tsx` — ExAgora metric band.
- `frontend/src/components/AgentCard.tsx` — coordinated market hover treatment.
- `frontend/src/components/TaskCard.tsx` — coordinated market hover treatment.
- `frontend/src/components/WorkReceiptPanel.tsx` — identity tooltip and proof timeline integration.
- `frontend/src/components/TransactionState.tsx` — active border and state language.
- `frontend/src/app/layout.tsx` — metadata.
- `frontend/src/app/**/*.tsx` — visible old-brand copy.
- `frontend/src/app/globals.css` — background and motion tokens.
- `PRD.md` — product-name rebrand while retaining Arc network terminology.

### Task 1: Centralize ExAgora Brand Identity

**Files:**
- Create: `frontend/src/lib/brand.ts`
- Create: `frontend/src/components/ExAgoraMark.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/AppHeader.tsx`

- [ ] **Step 1: Add canonical brand values**

```ts
export const BRAND = {
  name: "ExAgora",
  descriptor: "The Verified Agent Marketplace",
  tagline: "Discover agents. Verify work. Settle onchain.",
  description:
    "Discover agents, verify delivered work, and settle autonomous services onchain.",
} as const;
```

- [ ] **Step 2: Replace the Arc-shaped product mark**

Create a compact rectangular `ExAgoraMark` made from an outlined `EX` monogram
and use `aria-hidden` because the adjacent wordmark supplies the accessible
name.

- [ ] **Step 3: Use BRAND in metadata and wallet identity**

Update metadata, SIWE text, WalletConnect metadata, desktop wordmark, and mobile
sheet copy. Keep `Arc Testnet` only as network status.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands exit 0 and metadata contains ExAgora.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/brand.ts frontend/src/components/ExAgoraMark.tsx frontend/src/app/layout.tsx frontend/src/components/AppHeader.tsx
git commit -m "feat: establish ExAgora brand identity"
```

### Task 2: Add Quiet Aceternity Interaction Components

**Files:**
- Create: `frontend/src/components/exagora/InfrastructureBackdrop.tsx`
- Create: `frontend/src/components/exagora/PointerHighlight.tsx`
- Create: `frontend/src/components/exagora/MarketplaceHoverGrid.tsx`
- Create: `frontend/src/components/exagora/IdentityTooltip.tsx`
- Create: `frontend/src/components/exagora/ProofTimeline.tsx`
- Create: `frontend/src/components/exagora/ActiveBorder.tsx`
- Create: `frontend/src/components/exagora/TransactionButton.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Add solid-infrastructure backdrop**

Use the existing `/arc-agent-paths.png` through `next/image` at low opacity.
Add solid navy masks and no gradient, repeating grid, ambient loop, or glow.

- [ ] **Step 2: Add pointer highlight**

Implement a client component using Intersection Observer:

```ts
const [visible, setVisible] = useState(false);
```

Observe once, switch to the final state, and rely on
`prefers-reduced-motion` for immediate static rendering.

- [ ] **Step 3: Add coordinated hover and identity components**

`MarketplaceHoverGrid` exposes group state through data attributes. Cards may
translate by at most two pixels. `IdentityTooltip` wraps the existing Radix
Tooltip and displays role plus shortened address.

- [ ] **Step 4: Add proof and transaction components**

`ProofTimeline` receives `receipt` and `taskStatus` and builds only supported
stages. `ActiveBorder` animates only for signing/submitted phases.
`TransactionButton` maps idle, busy, submitted, and failed phases to existing
Button styling without executing contract logic.

- [ ] **Step 5: Add shared motion CSS**

Add keyframes for a short pointer reveal and active-border path. Disable them in
the existing reduced-motion query. Do not add an animation dependency.

- [ ] **Step 6: Verify and commit**

Run lint/build, then:

```bash
git add frontend/src/components/exagora frontend/src/app/globals.css
git commit -m "feat: add quiet ExAgora interaction components"
```

### Task 3: Rebuild the ExAgora Home Page

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/NetworkSnapshot.tsx`

- [ ] **Step 1: Replace hero composition**

Use:

- `BRAND.descriptor` as eyebrow.
- Three separate headline lines from `BRAND.tagline`.
- `PointerHighlight` around `Verify work.`
- `InfrastructureBackdrop` behind the hero.
- `Explore agents` and `List an agent` as primary actions.

- [ ] **Step 2: Restyle the metric band**

Use flat rectangular cells with strong dividers and transparent navy surfaces.
Show only real agent/task values and honest unavailable states.

- [ ] **Step 3: Preserve marketplace content**

Keep featured agents, task lifecycle, and the final call to action. Tighten copy
to ExAgora positioning and avoid hero-size typography below the first viewport.

- [ ] **Step 4: Verify desktop and mobile**

Use browser screenshots at 1440x1000 and 390x844. Expected:

- No horizontal overflow.
- No repeating grid.
- A hint of the next section is visible.
- Tagline wraps by sentence.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/NetworkSnapshot.tsx
git commit -m "feat: redesign ExAgora marketplace home"
```

### Task 4: Integrate Marketplace Hover and Proof Provenance

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/agents/page.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/components/AgentCard.tsx`
- Modify: `frontend/src/components/TaskCard.tsx`
- Modify: `frontend/src/components/WorkReceiptPanel.tsx`

- [ ] **Step 1: Wrap result grids**

Use `MarketplaceHoverGrid` around agent and task collections. Preserve current
grid breakpoints and semantic links.

- [ ] **Step 2: Normalize card hover**

Remove five-pixel hover shadow growth. Use:

```css
transform: translateY(-2px);
border-color: color-mix(in srgb, var(--primary) 55%, transparent);
```

Keep card dimensions stable.

- [ ] **Step 3: Add identity and proof timeline**

Use `IdentityTooltip` for the receipt verifier and `ProofTimeline` below receipt
metrics. If no receipt exists, preserve the current explanatory empty copy and
do not render invented timeline stages.

- [ ] **Step 4: Verify and commit**

Run lint/build and browser-check loaded agent/task records, then:

```bash
git add frontend/src/app/page.tsx frontend/src/app/agents/page.tsx frontend/src/app/dashboard/page.tsx frontend/src/components/AgentCard.tsx frontend/src/components/TaskCard.tsx frontend/src/components/WorkReceiptPanel.tsx
git commit -m "feat: add ExAgora market and proof interactions"
```

### Task 5: Integrate Transaction Activity Feedback

**Files:**
- Modify: `frontend/src/components/TransactionState.tsx`
- Modify: `frontend/src/app/register/page.tsx`
- Modify: `frontend/src/app/tasks/create/page.tsx`
- Modify: `frontend/src/app/tasks/[id]/page.tsx`

- [ ] **Step 1: Add active border to transaction state**

Wrap signing and submitted states in `ActiveBorder`. Confirmed, failed, and idle
states remain static.

- [ ] **Step 2: Replace action button presentation**

Use `TransactionButton` for registration, create task, start, approve, and
cancel actions while preserving every existing `onClick`, `disabled`, and phase
transition.

- [ ] **Step 3: Verify wallet-independent states**

Use a local SIWE session to inspect connected forms. Do not submit real
transactions. Confirm idle and disconnected pages remain accessible.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TransactionState.tsx frontend/src/app/register/page.tsx frontend/src/app/tasks/create/page.tsx 'frontend/src/app/tasks/[id]/page.tsx'
git commit -m "feat: add transaction-aware ExAgora motion"
```

### Task 6: Complete Product Copy Rebrand and Final QA

**Files:**
- Modify: `frontend/src/app/agents/page.tsx`
- Modify: `frontend/src/app/agents/[id]/page.tsx`
- Modify: `frontend/src/app/register/page.tsx`
- Modify: `frontend/src/app/tasks/[id]/page.tsx`
- Modify: `PRD.md`

- [ ] **Step 1: Replace old product-name copy**

Run:

```bash
rg -n "Arc Agent Market|ARC AGENT MARKET|Agent work you can verify|Verified autonomous work" frontend/src PRD.md
```

Replace product references with ExAgora or canonical brand copy. Preserve
`Arc Testnet`, `Arcscan`, `Arc L1`, and network-specific statements.

- [ ] **Step 2: Audit prohibited visual patterns**

Run:

```bash
rg -n "gradient|grid-cols|background-image|glow|animate-infinite|purple-|violet-|rounded-(xl|2xl|3xl)" frontend/src
```

Review each result. Grid layout utilities are allowed; repeating decorative
grid backgrounds and persistent glow are not.

- [ ] **Step 3: Run final verification**

```bash
cd frontend
npm run lint
npm run build
```

Browser QA all primary routes at desktop/mobile, inspect reduced-motion, verify
no horizontal overflow, and test the mobile wallet drawer-to-dialog transition.

- [ ] **Step 4: Commit**

```bash
git add frontend/src PRD.md
git commit -m "chore: complete ExAgora product rebrand"
```
