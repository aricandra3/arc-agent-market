# Neo-Brutal Retro Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic dark marketplace UI with the approved clean Arc-inspired Neo-Brutal Retro Glass system while preserving all wallet, contract, agent, task, escrow, reputation, and work-receipt behavior.

**Architecture:** Install official shadcn/ui source components into the existing Next.js 16 App Router application, then adapt their variants through a centralized token layer in `globals.css`. Build a small set of marketplace-specific components on top of those primitives and migrate one user workflow at a time, keeping viem contract calls and route semantics unchanged.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui with Radix, Lucide React, Sonner, viem, Zustand, Next Image, in-app Browser verification.

---

## Scope Check

This is one frontend-only subsystem. It does not change Solidity contracts, deployed addresses, ABIs, or transaction ordering. The work can be executed as one plan because every task contributes to the same reusable visual system and every route remains testable after each migration.

## File Map

### Create

- `frontend/components.json` — shadcn CLI configuration for Tailwind v4 and the existing `@/*` alias.
- `frontend/src/lib/utils.ts` — shadcn `cn()` utility.
- `frontend/src/components/ui/*.tsx` — official shadcn source for Button, Badge, Card, Dialog, Input, Label, Separator, Sheet, Skeleton, Tabs, Textarea, Tooltip, and Sonner.
- `frontend/src/components/AppHeader.tsx` — responsive navigation and wallet entry point.
- `frontend/src/components/ArcMark.tsx` — code-native Arc Agent Market brand mark.
- `frontend/src/components/PageHeader.tsx` — shared compact page title and action row.
- `frontend/src/components/EmptyState.tsx` — reusable actionable empty and error states.
- `frontend/src/components/NetworkSnapshot.tsx` — stable metric band used on the home page.
- `frontend/src/components/StatusBadge.tsx` — consistent agent, task, and receipt status mapping.
- `frontend/src/components/WorkReceiptPanel.tsx` — first-class task proof display.
- `frontend/src/components/TransactionState.tsx` — signing, submitted, success, and failure feedback.
- `frontend/public/arc-agent-paths.png` — original raster hero visual generated for this product.

### Modify

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/agents/page.tsx`
- `frontend/src/app/agents/[id]/page.tsx`
- `frontend/src/app/register/page.tsx`
- `frontend/src/app/tasks/create/page.tsx`
- `frontend/src/app/tasks/[id]/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/Navbar.tsx` — remove after its wallet logic has moved to `AppHeader`.
- `frontend/src/components/AgentCard.tsx`
- `frontend/src/components/TaskCard.tsx`
- `frontend/src/lib/contracts.ts` — presentation helpers only; contract definitions remain unchanged.

### Delete

- `frontend/src/components/Navbar.tsx` after `AppHeader` fully replaces it.
- Default unused assets under `frontend/public/`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, and `window.svg`.

## Task 1: Establish a Clean Baseline

**Files:**
- Read: `frontend/AGENTS.md`
- Read: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- Read: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- Read: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- Verify: all existing frontend files

- [ ] **Step 1: Confirm the worktree only contains expected changes**

Run:

```bash
git status --short
```

Expected: no uncommitted product changes. The design and plan commits may already exist in history.

- [ ] **Step 2: Record the current lint result**

Run:

```bash
cd frontend && npm run lint
```

Expected: exit `0`, or record exact pre-existing errors before changing code.

- [ ] **Step 3: Record the current production build result**

Run:

```bash
cd frontend && npm run build
```

Expected: exit `0`. If the existing build fails, stop and fix or document the baseline failure before attributing later failures to the redesign.

- [ ] **Step 4: Start the existing application and capture baseline routes**

Run:

```bash
cd frontend && npm run dev
```

Expected: Next.js reports a local URL, normally `http://localhost:3000`. Keep the server running for Browser checks.

- [ ] **Step 5: Verify the baseline with the in-app Browser**

Open `/`, `/agents`, `/register`, `/tasks/create`, and `/dashboard` at desktop width. Record whether live Arc testnet data loads and whether the wallet modal opens. Do not modify files in this step.

## Task 2: Install shadcn/ui and Define the Visual Foundation

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/separator.tsx`
- Create: `frontend/src/components/ui/sheet.tsx`
- Create: `frontend/src/components/ui/skeleton.tsx`
- Create: `frontend/src/components/ui/tabs.tsx`
- Create: `frontend/src/components/ui/textarea.tsx`
- Create: `frontend/src/components/ui/tooltip.tsx`
- Create: `frontend/src/components/ui/sonner.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create the shadcn CLI configuration**

Create `frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}
```

- [ ] **Step 2: Install official shadcn component source**

Run:

```bash
cd frontend && npx shadcn@latest add button badge card dialog input label separator sheet skeleton tabs textarea tooltip sonner -y
```

Expected: component files appear under `src/components/ui`, `src/lib/utils.ts` is created, and required packages plus `lucide-react` are added to `package.json`.

- [ ] **Step 3: Review generated changes before customization**

Run:

```bash
git diff -- frontend/package.json frontend/package-lock.json frontend/components.json frontend/src/lib/utils.ts frontend/src/components/ui frontend/src/app/globals.css
```

Expected: only shadcn configuration, dependencies, generated primitives, utility code, and theme additions. Restore no user work.

- [ ] **Step 4: Replace the generated theme with the approved tokens**

In `frontend/src/app/globals.css`, retain `@import "tailwindcss";`, shadcn animation imports if generated, and define these tokens:

```css
:root {
  --background: #071426;
  --foreground: #f4f7fb;
  --card: #10243c;
  --card-foreground: #f4f7fb;
  --popover: #0b192d;
  --popover-foreground: #f4f7fb;
  --primary: #c7dbf4;
  --primary-foreground: #071426;
  --secondary: #183654;
  --secondary-foreground: #f4f7fb;
  --muted: #10243c;
  --muted-foreground: #9eb9d3;
  --accent: #24496b;
  --accent-foreground: #f4f7fb;
  --destructive: #d36c72;
  --border: #416789;
  --input: #416789;
  --ring: #c7dbf4;
  --success: #6eb8ad;
  --warning: #d4ad6f;
  --surface-deep: #0b192d;
  --surface-strong: #183654;
  --steel: #24496b;
  --ink: #071426;
  --radius: 0.25rem;
}
```

Add global utilities with these exact responsibilities:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-space-grotesk);
  --font-mono: var(--font-ibm-plex-mono);
}

* {
  border-color: var(--border);
}

html {
  background: var(--background);
}

body {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-space-grotesk), sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

.app-container {
  width: min(100% - 2rem, 80rem);
  margin-inline: auto;
}

.brutal-surface {
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: var(--surface-deep);
  box-shadow: 3px 3px 0 #040c18;
}

.glass-surface {
  border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
  background: rgb(11 25 45 / 78%);
  box-shadow: 3px 3px 0 #040c18;
  backdrop-filter: blur(16px);
}

::selection {
  background: var(--primary);
  color: var(--ink);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Tune shadcn variants to the approved geometry**

Update generated primitives so:

- Button radius is `rounded-[4px]`, minimum height is `h-10`, primary buttons use `shadow-[3px_3px_0_#040c18]`, and hover moves `-translate-y-0.5`.
- Card radius is `rounded-[4px]` and has no default soft shadow.
- Dialog and Sheet content use a maximum `rounded-[8px]`, navy glass background, and crisp border.
- Input and Textarea use `rounded-[4px]`, `bg-[#0b192d]`, and a pale blue focus ring.
- Badge uses status-sized padding and does not apply large pill geometry unless explicitly passed `rounded-full`.

- [ ] **Step 6: Add optimized application fonts and providers**

Update `frontend/src/app/layout.tsx` to use variable fonts and global providers:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Arc Agent Market | Verified autonomous work",
  description:
    "Discover autonomous specialists, inspect proof-backed work, and settle tasks in USDC on Arc.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <TooltipProvider>
          <AppHeader />
          <main className="min-h-screen pt-20">{children}</main>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
```

Use a temporary `AppHeader` stub exporting a `64px` high header until Task 4:

```tsx
export default function AppHeader() {
  return <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-[#071426]" />;
}
```

- [ ] **Step 7: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: both commands exit `0`.

- [ ] **Step 8: Commit the foundation**

```bash
git add frontend/components.json frontend/package.json frontend/package-lock.json frontend/src/lib/utils.ts frontend/src/components/ui frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/src/components/AppHeader.tsx
git commit -m "feat: add Arc-inspired shadcn design foundation"
```

## Task 3: Build Marketplace-Specific Shared Components

**Files:**
- Create: `frontend/src/components/ArcMark.tsx`
- Create: `frontend/src/components/PageHeader.tsx`
- Create: `frontend/src/components/EmptyState.tsx`
- Create: `frontend/src/components/NetworkSnapshot.tsx`
- Create: `frontend/src/components/StatusBadge.tsx`
- Create: `frontend/src/components/WorkReceiptPanel.tsx`
- Create: `frontend/src/components/TransactionState.tsx`
- Modify: `frontend/src/lib/contracts.ts`

- [ ] **Step 1: Add presentation helpers without changing ABIs**

Append these helpers to `frontend/src/lib/contracts.ts`:

```ts
export function shortAddress(address: string, start = 6, end = 4): string {
  if (!address || address === ZERO_ADDRESS) return "Open";
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatDate(timestamp: bigint): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Number(timestamp) * 1000));
}

export function isUserRejectedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("user rejected") || message.includes("user denied");
}
```

Do not alter `CONTRACTS`, chain configuration, ABI arrays, transaction methods, or receipt normalization.

- [ ] **Step 2: Create a code-native brand mark**

`ArcMark` exposes `className?: string` and renders a `span` with `aria-hidden="true"`. Build the mark from CSS borders and pseudo-elements or nested spans; do not draw a custom SVG. It must remain legible at `24x18` and `32x24`.

The public API must be:

```tsx
type ArcMarkProps = {
  className?: string;
};

export function ArcMark({ className }: ArcMarkProps) {
  return (
    <span className={cn("relative block h-5 w-7", className)} aria-hidden="true">
      <span className="absolute inset-x-0 top-0 h-5 rounded-t-full border-2 border-b-0 border-current" />
      <span className="absolute bottom-0 left-1/2 h-4 w-px -translate-x-1/2 -rotate-12 bg-current" />
    </span>
  );
}
```

- [ ] **Step 3: Create `StatusBadge` with exhaustive mappings**

Expose:

```ts
type AgentStatus = "active" | "inactive";
type ReceiptStatus = "none" | "pending" | "passed" | "failed" | "disputed";

type StatusBadgeProps =
  | { kind: "agent"; status: AgentStatus }
  | { kind: "task"; status: number }
  | { kind: "receipt"; status: ReceiptStatus };
```

Use Lucide `Circle`, `Clock3`, `CircleCheck`, `CircleX`, `ShieldAlert`, `PauseCircle`, and `BadgeCheck`. Every status must include icon plus text. Map task indices against the existing `TASK_STATUS` constant and use neutral fallback text `"Unknown"`.

- [ ] **Step 4: Create structural shared components**

Implement:

```tsx
type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
};

type NetworkSnapshotProps = {
  agents: number;
  tasks: number;
  volume: string | null;
  isLoading: boolean;
};
```

`NetworkSnapshot` must render a three-column glass band on desktop and a one-column divided band on mobile. When volume is `null`, render `"Not indexed"` rather than a fabricated amount.

- [ ] **Step 5: Create `WorkReceiptPanel`**

Expose:

```tsx
type WorkReceiptPanelProps = {
  receipt: WorkReceiptRecord | null;
  taskStatus: number;
};
```

Behavior:

- `null` and task status below Submitted: explain when proof becomes available.
- `null` and Submitted or later: explain that no receipt has been attached.
- Pending: show pending verifier assignment.
- Passed/Failed/Disputed: show score, shortened verifier, receipt ID, and proof link when present.
- Use `StatusBadge`, `formatPercentBps`, `shortAddress`, and `ExternalLink`.

- [ ] **Step 6: Create `TransactionState`**

Expose:

```ts
export type TransactionPhase =
  | "idle"
  | "signing"
  | "submitted"
  | "confirmed"
  | "failed";

type TransactionStateProps = {
  phase: TransactionPhase;
  hash?: string;
  message?: string;
};
```

The component must reserve stable vertical space, link submitted hashes to `https://testnet.arcscan.app/tx/${hash}`, and use icon plus text for every non-idle phase.

- [ ] **Step 7: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`; no contract type or ABI changes.

- [ ] **Step 8: Commit shared components**

```bash
git add frontend/src/components/ArcMark.tsx frontend/src/components/PageHeader.tsx frontend/src/components/EmptyState.tsx frontend/src/components/NetworkSnapshot.tsx frontend/src/components/StatusBadge.tsx frontend/src/components/WorkReceiptPanel.tsx frontend/src/components/TransactionState.tsx frontend/src/lib/contracts.ts
git commit -m "feat: add marketplace UI components"
```

## Task 4: Replace Navigation and Wallet Modal

**Files:**
- Modify: `frontend/src/components/AppHeader.tsx`
- Delete: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Move wallet logic into `AppHeader`**

Move these behaviors from `Navbar` unchanged:

- Injected wallet detection.
- EIP-6963 provider list handling already present.
- WalletConnect initialization.
- SIWE nonce, message, signature, verification, and 24-hour local session.
- Zustand `setConnected` and `setDisconnected`.

Do not change chain ID `5042002`, WalletConnect project ID, or session storage key `siwe-session`.

- [ ] **Step 2: Replace emoji wallet metadata with Lucide icons**

Change `WalletOption.icon` from `string` to `LucideIcon`. Use:

```ts
const walletIcons = {
  metamask: WalletCards,
  coinbase: CircleDollarSign,
  trust: ShieldCheck,
  rabby: PanelsTopLeft,
  injected: Wallet,
  walletconnect: QrCode,
};
```

No emoji remain in the navigation or wallet dialog.

- [ ] **Step 3: Build the desktop application header**

Use:

- `ArcMark` plus `"Arc Agent Market"` as the first viewport brand signal.
- Links: Agents, Register, Create task, Dashboard.
- A small `"Arc Testnet"` status with `Radio`.
- shadcn `Button`, `Dialog`, and `Tooltip`.
- Glass background, `1px` outline, `3px` offset shadow.

Connected state shows shortened address and a disconnect icon button with tooltip. Disconnected state shows `Wallet` plus `"Connect wallet"`.

- [ ] **Step 4: Build the mobile `Sheet` navigation**

At widths below `md`, show a `Menu` icon button. The Sheet contains all four navigation links, network status, wallet address when connected, and disconnect/connect action. Touch targets must be at least `40px`.

- [ ] **Step 5: Convert wallet selection to shadcn `Dialog`**

Each wallet option is a full-width `Button` with icon, wallet name, and secondary description. Keep the MetaMask external link. Render connection errors inside the dialog with `CircleAlert`, and also send an error toast:

```ts
toast.error("Wallet connection failed", {
  description: errorMessage,
});
```

- [ ] **Step 6: Remove the old component**

Delete `frontend/src/components/Navbar.tsx`. Confirm `layout.tsx` imports only `AppHeader`.

- [ ] **Step 7: Verify wallet UI with Browser**

At desktop and mobile widths:

- Open and close the wallet dialog with mouse and Escape.
- Open and close the mobile Sheet.
- Verify tab focus remains trapped inside Dialog and Sheet.
- Verify no header item overlaps at `390px`.

- [ ] **Step 8: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 9: Commit navigation**

```bash
git add frontend/src/components/AppHeader.tsx frontend/src/components/Navbar.tsx frontend/src/app/layout.tsx
git commit -m "feat: redesign navigation and wallet access"
```

## Task 5: Generate the Hero Asset and Redesign Home

**Files:**
- Create: `frontend/public/arc-agent-paths.png`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/AgentCard.tsx`

- [ ] **Step 1: Generate the original hero raster**

Use the `imagegen` skill and save the result as `frontend/public/arc-agent-paths.png` with this prompt:

```text
Create a clean abstract financial-infrastructure bitmap for a website hero, 1600x1000 landscape. Deep navy background (#071426 and #10243C), thin pale steel-blue arcs and transaction paths, a few precise connection nodes, subtle depth, sophisticated and restrained. No grid, no text, no logos, no gradients, no glowing neon, no purple, no orange, no stock-photo elements. The right half should carry most visual detail; the left half should remain calm enough for large white headline text. Crisp high-end blockchain infrastructure art, understated Arc-inspired visual language.
```

Expected: a nonblank PNG with no text or grid.

- [ ] **Step 2: Verify the asset before use**

Inspect it with `view_image`. Reject and regenerate if it contains a grid, text, a logo, neon glow, purple accents, or insufficient contrast with pale text.

- [ ] **Step 3: Rebuild the home hero**

Keep existing contract loading but replace the markup with:

- `section` height constrained so the Network Snapshot is visible at `1440x900`.
- `Image` from `next/image` using `/arc-agent-paths.png`, `fill`, `priority`, `sizes="100vw"`, and decorative `alt=""`.
- Left-aligned eyebrow `"Verified agent economy"`.
- H1 `"Agent work you can verify."`.
- Body copy from the approved design spec.
- shadcn Buttons linking to `/agents` and `/tasks/create`.

Do not use gradient text, a split card layout, or a grid background.

- [ ] **Step 4: Replace the home stats with `NetworkSnapshot`**

Pass:

```tsx
<NetworkSnapshot
  agents={stats.agents}
  tasks={stats.tasks}
  volume={null}
  isLoading={isLoading}
/>
```

Do not display the existing invented `"0.00"` as transacted volume.

- [ ] **Step 5: Redesign featured agents**

Update `AgentCard` to use shadcn Card, Badge, Button styling, `StatusBadge`, `BadgeCheck`, `Star`, `BriefcaseBusiness`, and `CircleDollarSign`. Preserve its current props and link target.

Required hierarchy:

1. Agent identity and active status.
2. Description.
3. Capability badges.
4. Verified work strip when data exists.
5. Rating, task count, and rate.

Use a stable minimum card height and line clamping so cards align without hiding critical price or proof information.

- [ ] **Step 6: Replace “How it works” with the proof-and-settlement sequence**

Render four unframed steps with icons:

```ts
[
  ["01", "Select specialist", "Compare capability, price, reputation, and verified work."],
  ["02", "Escrow USDC", "Create a task and secure the budget on Arc."],
  ["03", "Inspect delivery", "Review the submitted work and its proof artifact."],
  ["04", "Verify and settle", "Read the receipt, approve the work, and release payment."],
]
```

Do not use four identical floating cards.

- [ ] **Step 7: Remove the generic CTA card**

End the page with a full-width bordered action band containing one sentence and two actions. Do not nest it inside another card.

- [ ] **Step 8: Verify home in Browser**

Check `1440x900` and `390x844`:

- Product name and headline are visible in the first viewport.
- A hint of Network Snapshot is visible below the hero.
- Hero image is nonblank and does not obscure text.
- Buttons and cards do not overlap.
- Live contract failure produces a readable fallback rather than broken layout.

- [ ] **Step 9: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 10: Commit home**

```bash
git add frontend/public/arc-agent-paths.png frontend/src/app/page.tsx frontend/src/components/AgentCard.tsx
git commit -m "feat: redesign verified agent marketplace home"
```

## Task 6: Redesign Agent Discovery

**Files:**
- Modify: `frontend/src/app/agents/page.tsx`
- Modify: `frontend/src/components/AgentCard.tsx`

- [ ] **Step 1: Add explicit load-error state**

Add:

```ts
const [loadError, setLoadError] = useState("");
```

On the outer contract read failure:

```ts
setLoadError("Agent records could not be loaded from Arc testnet.");
```

Keep per-agent failures isolated so one malformed record does not discard the list.

- [ ] **Step 2: Replace the page header and filter toolbar**

Use `PageHeader`, shadcn `Input`, `Search`, `SlidersHorizontal`, and `Badge`. Show the loaded agent count. Keep the current search matching rules.

The toolbar must remain one bordered surface, not separate floating cards.

- [ ] **Step 3: Add stable skeleton cards**

While loading, render six `Skeleton` records with the same minimum height and grid tracks as `AgentCard`.

- [ ] **Step 4: Add distinct empty and error states**

Use:

```tsx
<EmptyState
  icon={RadioTower}
  title="Arc testnet is unavailable"
  description={loadError}
  action={<Button onClick={() => window.location.reload()}>Retry</Button>}
  tone="error"
/>
```

For zero registered agents use title `"No agents registered yet"` and link to `/register`. For filter misses use title `"No agents match these filters"` and a button that clears both filter states.

- [ ] **Step 5: Verify discovery in Browser**

At desktop and mobile:

- Search by name.
- Search by description.
- Filter by skill.
- Clear filters.
- Confirm cards remain aligned with a long name and four tags.

- [ ] **Step 6: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 7: Commit discovery**

```bash
git add frontend/src/app/agents/page.tsx frontend/src/components/AgentCard.tsx
git commit -m "feat: redesign agent discovery"
```

## Task 7: Redesign Agent Profile

**Files:**
- Modify: `frontend/src/app/agents/[id]/page.tsx`

- [ ] **Step 1: Add error-aware loading**

Add a `loadError` state. Render a profile skeleton while loading and `EmptyState` with `"Agent record not found"` for missing data. Do not show a blank centered text line.

- [ ] **Step 2: Build the asymmetric profile layout**

Desktop layout:

```tsx
<div className="app-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
  <section className="min-w-0 space-y-8">{/* identity and proof */}</section>
  <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">{/* hire rail */}</aside>
</div>
```

Main column contains agent name, full wrapping address, active status, description, capability badges, verified work, and reputation. Side rail contains task price, API-call price, total earnings, explorer action, and hire action.

- [ ] **Step 3: Make verified work the primary trust section**

When stats exist, show receipt count, pass rate, and average score in one divided `brutal-surface`. When absent, render:

```text
No verifier-backed work has been recorded for this agent yet.
```

Do not hide the entire section.

- [ ] **Step 4: Reduce star-rating emphasis**

Show rating and review count as one supporting row with `Star`; do not render repeated star characters. Include completion rate from `Reputation` when available.

- [ ] **Step 5: Build responsive actions**

Use shadcn `Button` with `asChild` for the hire and Arcscan links. The primary hire action appears only when connected, preserving current behavior. On mobile, place actions after the pricing summary with full width.

- [ ] **Step 6: Verify profile in Browser**

Check:

- Connected and disconnected action hierarchy.
- A long `0x` address wraps without horizontal scrolling.
- No verification data produces a neutral state.
- Desktop side rail does not overlap the fixed header.

- [ ] **Step 7: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 8: Commit profile**

```bash
git add frontend/src/app/agents/[id]/page.tsx
git commit -m "feat: redesign agent profile trust view"
```

## Task 8: Redesign Registration and Task Creation Transactions

**Files:**
- Modify: `frontend/src/app/register/page.tsx`
- Modify: `frontend/src/app/tasks/create/page.tsx`

- [ ] **Step 1: Add explicit transaction phases to registration**

Replace `isSubmitting`, generic `success`, and alert-style feedback with:

```ts
const [phase, setPhase] = useState<TransactionPhase>("idle");
const [txHash, setTxHash] = useState("");
```

Before `sendTransaction`, set `"signing"`. After a hash is returned, set `"submitted"`, store the hash, and show a success toast. On error, set `"failed"` and distinguish user rejection with `isUserRejectedError`.

- [ ] **Step 2: Rebuild registration as four clear sections**

Use shadcn `Input`, `Textarea`, `Label`, `Button`, `Badge`, `Separator`, and `TransactionState`.

Sections:

1. Identity: name and description.
2. Capabilities: skill toggle buttons using `aria-pressed`.
3. Pricing: task and API-call rate.
4. Wallet summary: full address and network.

Keep the same validation rules and `registerAgent` arguments.

- [ ] **Step 3: Replace the registration success emoji**

Render `CircleCheck` inside a small outlined square, confirmation copy, transaction link, profile link, and browse link. No emoji or oversized celebration art.

- [ ] **Step 4: Add task transaction phases**

Use:

```ts
type CreateTaskPhase =
  | "idle"
  | "approving"
  | "creating"
  | "submitted"
  | "failed";
```

Keep transaction ordering exactly:

1. `approve(CONTRACTS.TASK_ESCROW, budgetWei)`
2. `createTask(provider, budgetWei, description, skills, deadline)`

The primary button label maps to:

- idle: `"Create task & escrow USDC"`
- approving: `"Approve USDC in wallet"`
- creating: `"Create task in wallet"`
- submitted: `"Task submitted"`
- failed: `"Try again"`

- [ ] **Step 5: Rebuild create-task form and escrow summary**

Use shadcn form primitives. On desktop use `grid-cols-[minmax(0,1fr)_18rem]` with the summary rail sticky beneath the header. The summary states:

- Budget amount.
- Provider or `"Open marketplace"`.
- Deadline in days.
- Step 1 `"Approve USDC"`.
- Step 2 `"Create task escrow"`.

On mobile, the summary appears before the submit action in normal flow.

- [ ] **Step 6: Replace all raw alerts**

Use `toast.success` and `toast.error` plus in-page `TransactionState`. No `alert()` remains in either file.

- [ ] **Step 7: Verify forms in Browser**

Test:

- Disconnected states.
- Empty required fields.
- No selected registration skill.
- Long description and skill strings.
- Mobile numeric inputs and wrapping labels.
- Submit controls remain disabled during active transaction phases.

Do not approve real transactions unless the user explicitly chooses to do so during QA.

- [ ] **Step 8: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 9: Commit forms**

```bash
git add frontend/src/app/register/page.tsx frontend/src/app/tasks/create/page.tsx
git commit -m "feat: redesign agent and task transaction forms"
```

## Task 9: Redesign Task Records and Proof Receipts

**Files:**
- Modify: `frontend/src/app/tasks/[id]/page.tsx`
- Modify: `frontend/src/components/TaskCard.tsx`

- [ ] **Step 1: Redesign `TaskCard`**

Preserve props and route. Use `StatusBadge`, `shortAddress`, `formatUSDC`, `ArrowRight`, `CircleDollarSign`, and `Clock3`. Keep status, description, participants, and budget visible. Apply fixed header and footer tracks so long descriptions do not move the budget row.

- [ ] **Step 2: Add task load-error and transaction state**

In task detail add:

```ts
const [loadError, setLoadError] = useState("");
const [actionPhase, setActionPhase] = useState<TransactionPhase>("idle");
const [actionHash, setActionHash] = useState("");
```

Convert action feedback from `alert()` to `TransactionState` and Sonner. Preserve `startTask`, `approveTask`, and `cancelTask` arguments.

- [ ] **Step 3: Build the task record header**

Show task ID, `StatusBadge`, budget, description, requester, provider, creation date, and deadline. Use a divided metadata band rather than four nested cards.

- [ ] **Step 4: Build the deliverable section**

If a deliverable exists, show its URI as an external action and display the deliverable hash in a wrapping monospace row. Otherwise render a neutral state explaining that the provider has not submitted one.

- [ ] **Step 5: Replace inline receipt markup**

Use:

```tsx
<WorkReceiptPanel receipt={receipt} taskStatus={task.status} />
```

No duplicate receipt-status styling remains in the page.

- [ ] **Step 6: Build contextual action hierarchy**

Use shadcn Buttons:

- Provider + Accepted: primary `"Start task"`.
- Requester + Submitted: primary `"Approve & release USDC"`.
- Requester + Open: destructive-outline `"Cancel task"`.
- Contract explorer: secondary external link.

Actions wrap on mobile and keep at least `40px` height.

- [ ] **Step 7: Verify task states in Browser**

Open an available task route and check:

- No-receipt state.
- Open provider address.
- Long description.
- Disconnected action state.
- External links include icons and do not overflow.

- [ ] **Step 8: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 9: Commit task records**

```bash
git add frontend/src/app/tasks/[id]/page.tsx frontend/src/components/TaskCard.tsx
git commit -m "feat: redesign task and proof receipt records"
```

## Task 10: Redesign Dashboard as an Operational Workspace

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/components/TaskCard.tsx`

- [ ] **Step 1: Load requester and provider tasks**

Replace the single task collection with:

```ts
const [requestedTasks, setRequestedTasks] = useState<DashboardTask[]>([]);
const [providerTasks, setProviderTasks] = useState<DashboardTask[]>([]);
```

Read both IDs in parallel:

```ts
const [requestedIds, providerIds] = await Promise.all([
  publicClient.readContract({
    address: CONTRACTS.TASK_ESCROW,
    abi: TASK_ESCROW_ABI,
    functionName: "getRequesterTasks",
    args: [walletAddress as `0x${string}`],
  }),
  publicClient.readContract({
    address: CONTRACTS.TASK_ESCROW,
    abi: TASK_ESCROW_ABI,
    functionName: "getProviderTasks",
    args: [walletAddress as `0x${string}`],
  }),
]);
```

Load up to ten records for each list with the existing `getTask` mapping.

- [ ] **Step 2: Build the dashboard header**

Use `PageHeader` with eyebrow `"Workspace"`, title `"Dashboard"`, shortened address, Arc Testnet state, and a Create task action.

- [ ] **Step 3: Redesign the agent summary**

When registered, render one wide operational band with:

- Agent name and skills.
- Earnings.
- Completed tasks.
- Verified receipt count.
- Profile action.

When not registered, use `EmptyState` with a real `Link` to `/register`; replace the current nonfunctional button.

- [ ] **Step 4: Add shadcn task tabs**

Use:

```tsx
<Tabs defaultValue="requested">
  <TabsList>
    <TabsTrigger value="requested">
      Requested <Badge>{requestedTasks.length}</Badge>
    </TabsTrigger>
    <TabsTrigger value="provider">
      Provider work <Badge>{providerTasks.length}</Badge>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="requested">{/* cards or empty state */}</TabsContent>
  <TabsContent value="provider">{/* cards or empty state */}</TabsContent>
</Tabs>
```

Each tab has a task grid or a context-specific EmptyState. Do not nest task cards inside another card.

- [ ] **Step 5: Add disconnected, loading, and error states**

Disconnected: prompt wallet connection without a fake dashboard. Loading: stable skeletons for header band and task rows. Error: `EmptyState` with retry.

- [ ] **Step 6: Verify dashboard in Browser**

Check:

- Disconnected state.
- Requested and provider tabs.
- Zero-task empty states.
- Registered-agent summary when the connected wallet is registered; otherwise the registration empty state.
- Mobile tab labels fit without horizontal page scrolling.

- [ ] **Step 7: Run lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: exit `0`.

- [ ] **Step 8: Commit dashboard**

```bash
git add frontend/src/app/dashboard/page.tsx frontend/src/components/TaskCard.tsx
git commit -m "feat: redesign operational dashboard"
```

## Task 11: Harden Responsive, Accessibility, and Edge States

**Files:**
- Modify: any frontend file touched in Tasks 2-10, limited to issues found by this verification.
- Delete: `frontend/public/file.svg`
- Delete: `frontend/public/globe.svg`
- Delete: `frontend/public/next.svg`
- Delete: `frontend/public/vercel.svg`
- Delete: `frontend/public/window.svg`

- [ ] **Step 1: Scan for deprecated visual patterns**

Run:

```bash
rg -n "gradient|rounded-(xl|2xl|3xl)|shadow-(lg|xl|2xl)|text-purple|bg-purple|glow|alert\\(|🦊|🔵|🛡|🐰|💼|📱|🎉" frontend/src
```

Expected: no decorative gradients, oversized default radii, glow helpers, raw alerts, or emoji UI remain. Semantic state styling may remain only where explicitly justified.

- [ ] **Step 2: Scan for legacy slate styling**

Run:

```bash
rg -n "slate-(6|7|8|9)|blue-600|purple-600" frontend/src
```

Expected: no old one-off palette remains outside a documented third-party override.

- [ ] **Step 3: Verify keyboard and reduced-motion behavior**

With Browser:

- Tab through header, wallet dialog, mobile Sheet, forms, tabs, agent cards, and task actions.
- Confirm visible focus rings.
- Confirm Dialog and Sheet close with Escape.
- Emulate reduced motion and confirm nonessential transitions are effectively disabled.

- [ ] **Step 4: Verify desktop routes**

At approximately `1440x900`, inspect:

- `/`
- `/agents`
- An existing `/agents/[id]`
- `/register`
- `/tasks/create`
- An existing `/tasks/[id]`
- `/dashboard`

Confirm no overlapping UI, no nested-card visual noise, no clipped text, and no blank hero asset.

- [ ] **Step 5: Verify mobile routes**

At approximately `390x844`, inspect the same routes. Confirm:

- No horizontal page scrolling.
- Mobile navigation remains usable.
- Forms use full available width.
- Long addresses wrap.
- Buttons and tabs fit or wrap cleanly.
- Fixed or sticky elements do not cover content.

- [ ] **Step 6: Check canvas/image pixels**

Take a screenshot of the home hero. Confirm the hero image region contains non-background pixels and is framed within the viewport. If the raster is blank, too dark, or cropped incorrectly, adjust `object-position`, opacity, or regenerate the asset.

- [ ] **Step 7: Remove unused starter assets**

Delete:

```text
frontend/public/file.svg
frontend/public/globe.svg
frontend/public/next.svg
frontend/public/vercel.svg
frontend/public/window.svg
```

Run `rg` first to confirm none are referenced.

- [ ] **Step 8: Run final automated verification**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: both exit `0`.

- [ ] **Step 9: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors, only intended frontend and generated asset changes, and no `.next` output staged.

- [ ] **Step 10: Commit hardening**

```bash
git add frontend
git commit -m "fix: polish responsive and accessible UI states"
```

## Task 12: Final Product Verification

**Files:**
- Verify: entire frontend

- [ ] **Step 1: Run a clean production build**

Run:

```bash
cd frontend && npm run build
```

Expected: Next.js production build exits `0` and lists all existing routes.

- [ ] **Step 2: Run the production server**

Run:

```bash
cd frontend && npm run start
```

Expected: production server starts on an available local port.

- [ ] **Step 3: Re-run critical browser journeys**

Verify:

1. Home to agent listing.
2. Agent listing to profile.
3. Profile to prefilled create-task route.
4. Create-task disconnected state.
5. Task detail proof panel.
6. Dashboard requested/provider tabs.
7. Wallet dialog open/close.

Do not submit real transactions without explicit user approval.

- [ ] **Step 4: Compare implementation to the approved spec**

Confirm:

- No grid background.
- Arc-inspired professional palette.
- Glass is limited to navigation and operational overlays/bands.
- Neo-brutal shadows remain compact and restrained.
- Official shadcn source components are used.
- Verified work has stronger hierarchy than generic ratings.
- Existing contract and wallet behavior remains intact.

- [ ] **Step 5: Prepare completion summary**

Report changed user journeys, verification commands and results, local URL, and any residual limitation such as `WORK_RECEIPT` remaining configured to `ZERO_ADDRESS`.

## Self-Review

### Spec Coverage

- Global palette, type, geometry, glass restraint, and no-grid rule: Tasks 2 and 11.
- Official shadcn components: Task 2.
- Responsive navigation and wallet Dialog/Sheet: Task 4.
- Original raster hero visual and first-viewport behavior: Task 5.
- Agent discovery and proof-focused cards: Tasks 5 and 6.
- Agent profile with proof hierarchy: Task 7.
- Registration and task creation transaction states: Task 8.
- Task detail and work receipt states: Task 9.
- Requested/provider dashboard tabs: Task 10.
- Accessibility, responsive layouts, reduced motion, and browser QA: Tasks 11 and 12.
- Existing contract semantics preserved: explicit boundaries throughout Tasks 3-10.

### Type Consistency

- `TransactionPhase` is defined in `TransactionState.tsx` and imported by transaction pages.
- `WorkReceiptPanel` consumes the existing `WorkReceiptRecord`.
- `StatusBadge` consumes numeric task status and explicit agent/receipt states.
- Existing `AgentCard` and `TaskCard` props remain stable, limiting migration risk.
- No planned helper changes the existing viem ABI or contract return types.

### No-Placeholder Check

The plan contains no unresolved implementation decisions. Visual states, component APIs, commands, expected outputs, copy, transaction ordering, and browser checks are specified.
