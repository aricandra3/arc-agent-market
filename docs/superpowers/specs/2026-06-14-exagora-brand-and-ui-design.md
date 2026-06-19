# ExAgora Brand and UI Design

## Goal

Rebrand Arc Agent Market as **ExAgora** and evolve the current interface toward
the approved neo-brutalist market reference while preserving the established
navy, steel-blue, and ice-blue palette.

The product identity is:

- **Brand:** ExAgora
- **Descriptor:** The Verified Agent Marketplace
- **Tagline:** Discover agents. Verify work. Settle onchain.

The redesign must make verification the visual center of the marketplace
without turning the product into a loud crypto landing page.

## Product Positioning

ExAgora is a marketplace where autonomous agents can be discovered, hired,
verified, and paid. Its differentiator is not agent listings alone; it is the
inspectable trail from agent identity through delivered work, verifier receipt,
and onchain settlement.

The three product hooks are:

1. **Discover agents** through capability, commercial terms, and reputation.
2. **Verify work** through proof-backed deliverables and verifier receipts.
3. **Settle onchain** through escrowed USDC payments on Arc.

Arc remains the current settlement network, but it is infrastructure rather
than the master brand. ExAgora must be capable of expanding beyond one chain
without another rebrand.

## Scope

Included:

- Replace user-facing "Arc Agent Market" branding with "ExAgora."
- Add the approved descriptor and tagline to the home page and relevant
  metadata.
- Update wallet-signing, WalletConnect, empty-state, and marketplace copy that
  refers to the old product name.
- Update the PRD's product name and product-level references while preserving
  technical references to Arc L1 and Arc Testnet.
- Redesign the home page using the approved boxed neo-brutalist composition.
- Carry the stronger visual language into shared navigation, metrics, cards,
  task records, proof receipts, and transaction states.
- Add selected Aceternity UI interaction patterns with restrained styling.
- Preserve shadcn components as the application's primitive component layer.
- Preserve all routes, contract reads and writes, wallet behavior, and data
  models.

Excluded:

- Smart contract changes.
- Renaming Arc Testnet, Arcscan, USDC, or deployed contracts.
- New routes or marketplace capabilities.
- A light theme.
- Persistent decorative animation.
- A full package-wide replacement of shadcn with Aceternity.

## Brand System

### Naming

Use `ExAgora` in visible prose and headings. Use `exagora` in machine-oriented
identifiers such as future domains, package names, and social handles.

Do not use:

- `EXAGORA` as the default prose form.
- `Exagora`.
- `Ex Agora`.
- `Arc Agent Market`.

The logo wordmark may render as uppercase through CSS, but its accessible name
and source text remain `ExAgora`.

### Core Copy

Primary home-page descriptor:

> The Verified Agent Marketplace

Primary home-page headline:

> Discover agents. Verify work. Settle onchain.

Supporting copy:

> Proof-backed work history, verifier receipts, and USDC settlement for
> autonomous services.

Primary actions:

- Explore agents
- List an agent

The term "post a task" remains available as a secondary marketplace action
outside the first hero action pair.

### Metadata and Wallet Identity

Application metadata:

- Title: `ExAgora | The Verified Agent Marketplace`
- Description: `Discover agents, verify delivered work, and settle autonomous
  services onchain.`

SIWE and WalletConnect identify the product as ExAgora. Wallet text may mention
Arc only when describing the active network.

## Visual Direction

### Tone

ExAgora should feel like a precise marketplace terminal with a bold editorial
front door. It combines:

- Neo-brutalist hierarchy and rectangular framing.
- Financial-infrastructure restraint.
- Compact retro terminal details.
- Quiet motion that explains product state.

The interface is confident rather than playful, technical rather than
futuristic, and distinctive without neon or spectacle.

### Color Palette

Retain the current tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#071426` | Main canvas |
| `--surface-deep` | `#0B192D` | Panels and navigation |
| `--surface` | `#10243C` | Raised content |
| `--surface-strong` | `#183654` | Selected and hover states |
| `--steel` | `#24496B` | Secondary controls |
| `--border` | `#416789` | Structural outlines |
| `--muted-foreground` | `#9EB9D3` | Supporting text |
| `--primary` | `#C7DBF4` | Primary actions and proof highlight |
| `--foreground` | `#F4F7FB` | Main text |
| `--success` | `#6EB8AD` | Verified and settled states |
| `--warning` | `#D4AD6F` | Pending and deadline states |
| `--destructive` | `#D36C72` | Failed and destructive states |

No new neon accent palette is introduced. Aceternity components inherit these
tokens rather than their default purple, cyan, or gradient styling.

### Background: Solid Infrastructure

There is no graph-paper grid.

The main canvas remains solid navy. The hero may use the existing generated
transaction-path bitmap at very low opacity to create sparse orbit and registry
marks. It must read as infrastructure depth, not as a prominent illustration.

Rules:

- No repeating grid background.
- No gradient backdrop.
- No glowing orbs or bokeh.
- No animated ambient background.
- Orbit and registry lines stay below approximately 20% perceived contrast.
- Content and primary actions retain full contrast over the visual.

### Structure

The reference's structural qualities are adopted:

- A boxed, offset-shadow navigation bar.
- Large uppercase home-page typography.
- A pale rectangular highlight behind `Verify work.`
- Flat metric cells with strong dividers.
- Compact rectangular buttons.
- One- to four-pixel radii, except dialogs where up to eight pixels is allowed.
- Three- to five-pixel dark offset shadows.

The reference's light lavender canvas, lime, orange, coral, and full-page grid
are not adopted.

## Home Page

### First Viewport

The home page opens with ExAgora as the first visual signal in the navigation.
The hero then contains:

1. Descriptor in compact monospace text.
2. Three-line uppercase headline:
   - Discover agents.
   - Verify work.
   - Settle onchain.
3. `Verify work.` inside an ice-blue neo-brutalist highlight.
4. Supporting copy about proof-backed work history, verifier receipts, and
   USDC settlement.
5. Primary actions for exploring agents and listing an agent.
6. A compact live marketplace statistics band.

The first viewport must still reveal a hint of the next section on common
desktop and mobile sizes.

### Statistics

Use available onchain values rather than decorative sample numbers:

- Live agents.
- Tasks created or work records.
- Verified receipts when configured.

If a metric is not available, show an honest state such as `Not indexed` or
`Not configured`. Do not fabricate a verification percentage.

### Remaining Sections

Preserve and restyle:

- Featured specialists.
- Task lifecycle.
- Final marketplace call to action.

These sections use quieter typography than the hero. They should not reproduce
the hero's oversized treatment.

## Application Shell and Internal Pages

### Header

The header becomes more rectangular and editorial:

- ExAgora wordmark on the left.
- Agents, Register, Create task, and Dashboard navigation.
- Arc Testnet as a compact network state, not part of the brand.
- Wallet access on the right.
- Existing responsive drawer behavior remains.

### Agent and Task Cards

Cards retain their dense operational content. The redesign adds:

- Stronger top-level hierarchy.
- Stable rectangular dimensions.
- Small hover translation.
- Proof and receipt signals before generic rating signals where available.
- No nested decorative cards.

### Agent Profile

The profile emphasizes:

1. Identity and availability.
2. Verified work.
3. Reputation.
4. Commercial terms.

### Task Detail

The task record emphasizes:

1. Task status and escrow amount.
2. Requester and provider.
3. Deliverable.
4. Proof receipt and verification provenance.
5. Contextual settlement action.

### Forms and Dashboard

Registration and task creation remain quiet work surfaces. The dashboard
continues to support requester and provider views. Aceternity patterns are used
only for feedback and state transitions, not for decorative section framing.

## Aceternity Integration

Aceternity patterns are adapted to ExAgora's tokens and component conventions.
They complement shadcn primitives and do not introduce a second competing
design system.

### Pointer Highlight

Use on `Verify work.` in the home-page headline.

- The highlight is ice blue, rectangular, and offset-shadowed.
- Its entrance animation runs once when the hero enters the viewport.
- It does not loop.
- Reduced-motion renders the final state immediately.

### Card Hover Effect

Use for agent and task result grids.

- Maximum translation is two pixels.
- Border contrast may increase slightly.
- Neighboring cards do not dim heavily.
- No glow, scale jump, tilt, or cursor-following spotlight.

### Animated Tooltip

Use for verifier or participant identities where multiple addresses would make
the interface difficult to scan.

- Tooltips show identity, role, and shortened address.
- They use existing shadcn/Radix accessibility behavior.
- Animation is a short opacity and vertical-position transition.
- They are not used for ordinary icon labels that the existing Tooltip already
  handles.

### Timeline

Use for proof-receipt provenance:

- Work submitted.
- Proof attached.
- Verification passed or failed.
- Settlement released.

The timeline is data-driven and renders only stages supported by the current
task and receipt records. It does not invent missing events.

### Stateful Button

Use for registration, task creation, approval, and release actions.

Supported visual states:

- Idle.
- Waiting for wallet.
- Submitted.
- Confirmed where confirmation is observable.
- Failed.

The component wraps existing transaction logic and does not alter contract
calls.

### Moving Border

Use only for genuinely active operations:

- Waiting for a wallet signature.
- Transaction submitted and awaiting observable completion.
- Verification actively pending when represented in data.

The effect:

- Uses a muted ice-blue or teal segment.
- Has no outer glow.
- Stops after success or failure.
- Never appears on static cards, navigation, or normal buttons.

## Motion Rules

Motion communicates state and hierarchy.

- No ambient looping animation.
- No animated background.
- No parallax.
- No springy scale effects.
- Hover transitions stay between 120 and 180 milliseconds.
- State transitions stay below 300 milliseconds where practical.
- `prefers-reduced-motion` disables entrance and moving-border animation.
- Motion must not cause layout shifts.

## Component Architecture

Keep the existing `frontend/src/components/ui` shadcn layer.

Add focused components under `frontend/src/components/exagora`:

- `PointerHighlight.tsx`
- `MarketplaceHoverGrid.tsx`
- `IdentityTooltip.tsx`
- `ProofTimeline.tsx`
- `TransactionButton.tsx`
- `ActiveBorder.tsx`
- `InfrastructureBackdrop.tsx`

Add shared brand content in `frontend/src/lib/brand.ts` so metadata, wallet
copy, header copy, and home-page copy use the same values.

Components should depend on tokens and existing UI primitives. They should not
hard-code Aceternity's default palette or introduce large animation libraries
unless the selected component cannot be implemented clearly with the current
stack and CSS.

## Accessibility

- Preserve one descriptive `h1` per route state.
- Keep all wallet and menu controls keyboard accessible.
- Animated tooltips expose the same information through focus.
- Timeline status is understandable without color.
- Moving borders are never the only progress indicator.
- Text contrast remains WCAG AA against navy surfaces.
- The wordmark's accessible text is `ExAgora`.
- Decorative infrastructure visuals use empty alternative text.

## Responsive Behavior

- At narrow widths, the hero headline wraps by sentence rather than shrinking
  with viewport-relative typography.
- Primary actions stack and remain full width where needed.
- Metric cells stack vertically on small screens.
- Navigation collapses to the existing drawer.
- Proof timelines remain readable without horizontal scrolling.
- Cards and forms must not exceed the viewport at 320 pixels.

## Performance

- Reuse the existing hero bitmap rather than generating multiple decorative
  assets.
- Prefer CSS transitions and Intersection Observer over continuous JavaScript
  animation.
- Avoid shipping an animation dependency solely for one effect.
- Lazy-render noncritical identity tooltips and timelines through normal React
  composition rather than route-level client bundles.
- Keep the hero visual optimized through `next/image`.

## Acceptance Criteria

The redesign is complete when:

- All visible old product-name references are replaced with ExAgora.
- Product metadata, SIWE, and WalletConnect identify ExAgora.
- Arc remains visible only as the active settlement network where relevant.
- The home page displays the approved descriptor and tagline.
- The home page follows the approved boxed neo-brutalist composition.
- There is no repeating grid background.
- The existing navy palette is preserved.
- The selected Aceternity patterns are implemented with the motion constraints
  above.
- Internal pages remain operational and less visually aggressive than the
  home page.
- Existing wallet, agent, task, escrow, reputation, and receipt flows continue
  to function.
- Desktop and mobile pages have no horizontal overflow.
- Reduced-motion users receive equivalent static states.
- Lint and production build pass.

## Validation

Run:

```bash
cd frontend
npm run lint
npm run build
```

Browser QA covers:

- Home at desktop and mobile widths.
- Mobile navigation and wallet dialog.
- Agent listing and loaded agent profile.
- Connected and disconnected registration.
- Connected and disconnected task creation.
- Loaded task detail and proof receipt.
- Connected and disconnected dashboard.
- Keyboard focus on interactive Aceternity patterns.
- Reduced-motion rendering.
