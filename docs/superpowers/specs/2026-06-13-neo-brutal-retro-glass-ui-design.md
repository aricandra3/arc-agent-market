# Neo-Brutal Retro Glass UI Design

## Goal

Redesign the Arc Agent Market frontend into a clean, professional marketplace for verified autonomous work. The new interface should feel native to Arc's visual world without copying Arc's website, while preserving every existing marketplace, wallet, escrow, agent, reputation, and work-receipt flow.

The visual distinction comes from three ideas used with restraint:

- Arc-inspired deep navy and steel-blue surfaces.
- Neo-brutal structure through crisp outlines and compact offset shadows.
- Retro glass through translucent navigation and operational panels, not decorative glass cards everywhere.

## Product Positioning

The interface should make the product's differentiator immediately clear: users are not only hiring AI agents, they are buying work with an inspectable proof and settlement trail.

The primary home-page message is:

> Agent work you can verify.

Supporting language should emphasize:

- Discovering autonomous specialists.
- Inspecting verifier-backed work history.
- Escrowing and settling tasks in USDC on Arc.
- Reading proof receipts without needing blockchain expertise.

The UI must present verified work as practical work history, not protocol debugging.

## Scope

Included:

- A new global visual system and responsive application shell.
- A redesigned home page.
- Redesigned agent listing, agent profile, registration, task creation, task detail, and dashboard pages.
- Reusable shadcn-style UI primitives.
- Purposeful loading, empty, error, transaction, and wallet states.
- Lucide icons for interface actions and status communication.
- A small original raster hero visual that uses arcs and transaction paths without a grid background.
- Accessibility, responsive behavior, and reduced-motion support.

Preserved:

- Existing routes and navigation destinations.
- Existing contract reads and writes.
- Existing wallet detection, WalletConnect, SIWE session, and disconnect behavior.
- Existing agent, task, reputation, and work-receipt data.
- Existing Arc testnet explorer links.

Deferred:

- Contract changes.
- New marketplace features or new routes.
- Automated verifier workflows.
- A theme switcher.
- A full charting or analytics system.
- Internationalization.

## Design Direction

### Tone

The product should feel like a precise market terminal with a calm financial-infrastructure character. It is technical but not cyberpunk, professional but not corporate, and distinctive without being loud.

### Visual Memory

The memorable element is a proof-and-settlement language built from:

- Thin outlined surfaces.
- Small dark offset shadows.
- Arc-shaped transaction paths.
- Compact uppercase metadata.
- Clear proof states embedded into agent and task surfaces.

There is no grid background. Decorative gradients, glowing orbs, neon accents, and oversized rounded cards are excluded.

### Color System

Core palette:

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#071426` | Main page background |
| `--surface-deep` | `#0B192D` | Primary sections and controls |
| `--surface` | `#10243C` | Raised surfaces |
| `--surface-strong` | `#183654` | Hover and selected surfaces |
| `--steel` | `#24496B` | Secondary accents and dividers |
| `--muted` | `#7FA7C8` | Supporting text and metadata |
| `--primary` | `#C7DBF4` | Primary actions and highlights |
| `--foreground` | `#F4F7FB` | Primary text |
| `--ink` | `#071426` | Text on pale controls |

Semantic colors are muted toward the Arc palette:

- Success: cool teal, reserved for passed receipts and completed settlement.
- Warning: desaturated amber, reserved for pending verification and approaching deadlines.
- Error: muted coral, reserved for failed receipts, transaction failures, and destructive actions.
- Info: steel blue, used for neutral in-progress states.

Semantic colors must not become page-level palette families. They appear only where state needs to be distinguished.

### Typography

- Display and interface: `Space Grotesk Variable`.
- Technical metadata and addresses: `IBM Plex Mono Variable`.
- Hero headings use a restrained geometric uppercase treatment.
- Page and panel headings use compact sentence case.
- Letter spacing is `0`; hierarchy comes from size, weight, and spacing.
- Font sizes use fixed responsive breakpoints, not viewport-width scaling.

Addresses, transaction hashes, receipt IDs, network labels, and compact metadata may use monospace. Body copy and ordinary labels do not.

### Geometry

- Default radius: `4px`.
- Tool and data surfaces: `0-4px`.
- Dialog and drawer: maximum `8px`.
- Borders: primarily `1px`.
- Neo-brutal offset shadow: `3px 3px 0 #040C18`.
- Large feature surfaces may use `5px 5px 0 #040C18`.
- Pills are reserved for true statuses, filters, and compact tags.

Glass surfaces use navy transparency with `backdrop-blur`, always paired with a readable opaque fallback. Glass is limited to:

- Global navigation.
- Mobile navigation drawer.
- Network snapshot band.
- Wallet dialog.
- Sticky transaction/action bars where context must remain visible.

## Design System Architecture

The frontend will add official shadcn component source under `src/components/ui`, then adapt its variants to the approved visual system. Components remain owned by the repository.

Foundation:

- `cn` utility using `clsx` and `tailwind-merge`.
- CSS variables in `globals.css`.
- `class-variance-authority` for variant-heavy controls.
- `lucide-react` for icons.

Initial UI primitives:

- `Button`
- `Badge`
- `Card`
- `Dialog`
- `Drawer` or `Sheet`
- `Input`
- `Textarea`
- `Label`
- `Separator`
- `Skeleton`
- `Tabs`
- `Tooltip`
- `Sonner`

Cards are used only for repeated agent and task records, framed proof records, and dialogs. Page sections remain unframed or use full-width bands.

Shared application components:

- `AppHeader`: desktop navigation, mobile drawer, wallet action, network status.
- `PageHeader`: title, concise supporting text, optional action.
- `NetworkSnapshot`: real marketplace metrics and loading state.
- `AgentCard`: scan-friendly agent identity, capability, proof, reputation, and price.
- `TaskCard`: task status, participants, budget, and timing.
- `VerificationBadge`: none, pending, passed, failed, or disputed.
- `WorkReceiptPanel`: verifier, score, proof artifact, and receipt status.
- `TransactionState`: signing, submitted, confirmed, and failed feedback.
- `EmptyState`: context-specific next action.

## Page Designs

### Global Navigation

The header is a thin translucent navy bar with a crisp outline and small offset shadow. The brand mark and product name form the strongest signal at the left. Desktop navigation uses concise links. The wallet control remains the primary utility action.

On mobile, navigation moves into a shadcn `Sheet`. Critical wallet and route access remains available; nothing essential is hidden.

### Home

The home page opens directly into the marketplace proposition rather than a marketing splash screen.

Hero:

- Left-aligned headline: "Agent work you can verify."
- Supporting copy explains discovery, proof-backed work history, and USDC settlement.
- Primary action: explore agents.
- Secondary action: post a task.
- A subtle original raster image of Arc-like transaction paths occupies the background/right field. It contains no grid, no text, and no product screenshot.
- The next section remains visible at common desktop and mobile viewport heights.

Immediately below the hero, a compact glass network snapshot shows actual agent and task counts. Volume stays explicitly unavailable or zero until real volume data exists; it must not display invented metrics.

Featured agents follow as repeated cards. The final operational section explains the task lifecycle as a horizontal or stacked sequence:

1. Select an agent or open a task.
2. Escrow USDC.
3. Receive the deliverable.
4. Inspect the receipt and settle.

### Agent Listing

The page prioritizes comparison and repeated scanning:

- Compact header with agent count.
- Search input and skill filter in one restrained toolbar.
- Responsive two- or three-column repeated agent cards.
- Skeleton cards during contract reads.
- Empty states distinguish no registered agents from no filter matches.

An agent card shows:

- Name, shortened address, and active status.
- Two-line description.
- Up to four capability tags.
- Verified receipt count and pass rate when available.
- Rating, completed task count, and rate per task.

The proof signal sits in the card's information hierarchy and is not a decorative badge.

### Agent Profile

The profile uses an asymmetric two-column desktop layout:

- Main column: identity, description, capabilities, reputation, and verified work.
- Side rail: pricing, availability, explorer link, and hire action.

Verified work receives more visual emphasis than star ratings. If verification data is absent, the page explains that no proof-backed work is available without implying failure.

On mobile, the side rail becomes a normal flow section and the hire action may become a sticky bottom action bar.

### Register Agent

The registration flow remains one page but is divided into clear sections:

- Identity.
- Capabilities.
- Pricing.
- Wallet and transaction summary.

Skill selection uses toggle buttons with a visible selected state. Validation appears inline. Transaction feedback uses toast plus an in-page confirmation state. Emoji-based success art is removed.

### Create Task

The form uses:

- Provider address with clear optional/open-task copy.
- Description.
- Budget.
- Deadline.
- Required skills.
- A persistent escrow summary showing budget and the two-transaction sequence: approve USDC, then create task.

The submit control communicates the current phase instead of using one generic loading label.

### Task Detail

The page behaves like a task record:

- Header with task ID, status, and budget.
- Participant and deadline metadata.
- Deliverable section.
- Proof receipt section.
- Contextual actions based on wallet role and task status.

The work receipt is a first-class panel. Passed, pending, failed, and no-receipt states each have distinct copy and semantic styling. Proof artifacts and explorer destinations use external-link icons and clear labels.

Destructive actions are visually secondary until they are relevant.

### Dashboard

The dashboard is a work-focused operational view:

- Wallet identity and network state.
- Agent summary if the connected wallet is registered.
- Verified work and earnings summary.
- Task tabs for requested and provider work, using the existing `getRequesterTasks` and `getProviderTasks` contract reads.
- Empty states point to registration, agent discovery, or task creation as appropriate.

The dashboard avoids a marketing hero and decorative card wall.

## Data and Interaction Flow

Contract data loading remains client-side with the existing viem public client.

Read flow:

1. Render stable page shell and skeletons.
2. Load contract counts or records.
3. Load verification stats where configured.
4. Replace skeletons without shifting the overall layout.
5. Show a local error state if reads fail while preserving navigation and retry options.

Transaction flow:

1. Validate locally.
2. Ask the connected wallet to sign.
3. Show signing state.
4. Submit and show the transaction hash.
5. Link to Arcscan.
6. Show confirmed or failed feedback.

The redesign does not alter contract call order or ABI usage.

## Error Handling

- Wallet absence: explain the required action and keep a visible connect control.
- Contract read failure: show a compact error state with retry instead of silently presenting empty data.
- Missing WorkReceipt deployment: omit receipt stats gracefully and retain marketplace functionality.
- Transaction rejection: distinguish user rejection from network or contract failure.
- Invalid address or numeric input: show inline validation before opening the wallet.
- Long names, skills, addresses, and descriptions: clamp or wrap without changing fixed control dimensions.

Raw `alert()` calls should be replaced with shadcn-compatible toast feedback.

## Motion

Motion is sparse and functional:

- One page-load sequence for hero copy, actions, and snapshot.
- Hover uses a `1-2px` translation while the compact offset shadow increases.
- Status and transaction changes use opacity and transform.
- No bounce, elastic motion, glowing pulses, or looping decoration.
- `prefers-reduced-motion` disables nonessential motion.

## Responsive Behavior

Breakpoints follow the application's Tailwind conventions.

- Desktop: asymmetric compositions, two-column detail pages, three-column agent grid.
- Tablet: reduced hero scale, two-column agent grid, simplified metadata rows.
- Mobile: single-column content, mobile navigation sheet, full-width form controls, wrapped action groups, and sticky primary actions where useful.

Fixed-format elements such as status badges, icon buttons, card headers, and metric cells have stable dimensions so content loading does not resize the interface unexpectedly.

## Accessibility

- All interactive controls are keyboard accessible.
- Focus rings use the pale blue primary token and remain visible against navy surfaces.
- Color is never the only status signal; each state includes a label and icon.
- Dialog and sheet primitives manage focus and Escape behavior.
- Touch targets are at least 40px.
- Body text and muted text meet WCAG AA contrast against their surfaces.
- External links identify themselves visually.

## Testing and Verification

Automated checks:

- Existing lint and production build.
- Focused component tests if a test runner already exists; no new test framework is introduced solely for this redesign.
- Type checking through the Next.js build.

Browser verification:

- Home, agent listing, agent profile, register, create task, task detail, and dashboard.
- Desktop viewport near `1440x900`.
- Mobile viewport near `390x844`.
- Wallet disconnected state.
- Loading and empty states.
- Long address, long agent name, and long skill inputs.
- Proof receipt states where available.
- No overlapping text or controls.
- No blank or missing hero raster asset.

## Implementation Boundaries

The redesign is a frontend-only refactor. It may reorganize presentational components and introduce shared UI primitives, but it must not rewrite contract logic, change route semantics, or invent blockchain data.

The work is complete when all current user flows remain usable, the approved visual direction is consistently applied across every route, and desktop/mobile browser checks show no layout overlap or missing content.
