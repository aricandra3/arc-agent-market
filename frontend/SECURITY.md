# Security & dependency policy (frontend)

This documents how we handle dependency vulnerabilities for the ExAgora
frontend, and which advisories are knowingly accepted.

## npm audit policy

- ✅ **`npm audit fix`** (without `--force`) is safe — it only applies
  non-breaking patch upgrades.
- ❌ **Never run `npm audit fix --force`.** For this project's remaining
  advisories, npm's only "fix" path is to **downgrade `next` and `viem` to
  ancient majors** (e.g. `next@9`, `viem@0.2`). That breaks the app (React 19 +
  App Router are incompatible with Next 9) **and makes things worse** — Next 9
  drags in an old webpack/babel toolchain, which exploded the audit count from
  ~22 to ~102 in testing. The modern, supported versions are the safer choice.

When a CVE matters to us directly, prefer a scoped
[`overrides`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
entry pinning the transitive package to a patched version — then verify
`npm run build` and WalletConnect connect flow before committing.

## Accepted transitive risks

These come from third-party Web3 / framework dependencies and cannot be fixed
without downgrading core packages. They are low practical risk for this app and
are tracked for upstream resolution.

| Advisory | Path | Why accepted |
| --- | --- | --- |
| `ws` DoS / memory disclosure | `viem` → `@walletconnect/*` / `@reown/appkit` | WalletConnect relay transport. Requires a malicious WS peer; WC uses trusted relays. Fix would downgrade `viem`. |
| `postcss` ReDoS / stringify XSS | bundled inside `next` | Next's own internal copy; build-time only. Resolves when Next updates. |
| `esbuild` dev-server request | `vite` → `vitest` | **Dev/test only** — never ships to production. Affects the local dev server. |

Re-check after upgrading `next`, `viem`, `@walletconnect/ethereum-provider`,
or `vitest` (a future `vitest@4` upgrade clears the esbuild/vite advisories).

## Safe baseline

- `next` **16.2.7**, `react` 19, `viem` **^2.52.2**, `@walletconnect/ethereum-provider` **^2.23.9**, `vitest` **^2.1.8**
- `npm run build`, `npm test`, `npm run lint`, and `npx tsc --noEmit` all pass on this baseline.

## Wallet / auth notes

- Auth is **Sign-In with Ethereum (EIP-4361)** — a gas-free signature only. No
  private keys are ever handled by the app.
- Wallet discovery uses **EIP-6963**; WalletConnect is opt-in via QR.
- Transactions are blocked in the UI when the wallet is on a non-Arc chain.
