# Key handling & incident response

## Key model

| Key | Holds | Risk if leaked |
| --- | --- | --- |
| **Deploy key** (`PRIVATE_KEY`) | Just enough balance to deploy | Low, *if* `OWNER_ADDRESS` is set — it owns nothing afterwards |
| **Owner** (`OWNER_ADDRESS`) | Admin rights on all contracts + receives every platform fee | High — see below |

Set `OWNER_ADDRESS` to a cold wallet or multisig. Leave it blank and the deploy
key becomes the owner, collapsing both rows into one key.

The contracts use OpenZeppelin `Ownable2Step`: `transferOwnership` only records a
*pending* owner, and the new owner must call `acceptOwnership()`. A transfer to
an address that cannot accept therefore changes nothing, and the current owner
keeps control.

## What the owner key can do

- `TaskEscrow.resolveDispute` — split the escrow of any **Disputed** task
  arbitrarily. This is the direct fund-theft path.
- `TaskEscrow.setPlatformFee` / `MicroPayment.setPlatformFee` — raise fees to 10%.
- Receive **all** platform fees (they are paid to `owner()`).
- `AgentRegistry.setAuthorizedWriter` — authorize any contract to forge
  `completedTasks`, `totalEarnings`, and ratings.
- `Reputation.setTaskEscrow` / `setAgentRegistry` — repoint reputation at a fake
  escrow and fabricate history.
- `VerifierRegistry.registerVerifier` — register an attacker-controlled verifier,
  which can then pass or fail any `WorkReceipt`.

`WorkReceipt` has no owner and no admin functions.

## If a key leaks

1. **Move the funds first.** Sweep any balance off the compromised address to a
   fresh one. Do this yourself from your wallet.
2. **Check the blast radius.**
   ```bash
   STATUS=1 npx hardhat run scripts/rotate-owner.js --network arcTestnet
   ```
   This prints the current and pending owner of every contract.
3. **Rotate ownership**, using the *current* owner's key:
   ```bash
   OWNER_ADDRESS=0xYourNewColdWallet npx hardhat run scripts/rotate-owner.js --network arcTestnet
   ```
   Then call `acceptOwnership()` on each contract from the new address. Until
   that call lands, the old key is still the owner.
4. **Prefer redeploying** when the leaked key is the owner. Rotation is a race:
   the attacker holds the same key and can rotate to an address of their own, or
   drain disputed escrows, before you finish. Redeploying from a clean key with
   `OWNER_ADDRESS` set removes the race entirely.
5. **Find the leak vector.** `.env` is gitignored and has never been committed to
   this repo, so a leak came from somewhere else — a paste into a chat or issue,
   a screenshot, a synced folder, a CI log, or a second checkout.

## Guardrails in the tooling

- `.gitignore` matches `.env*` and re-allows only `.env.example`. The previous
  `.env` pattern did **not** cover `.env.local` or `.env.production`.
- `scripts/deploy.js` refuses to run against a non-local network when the
  deployer is one of the publicly published Hardhat/Foundry test keys, or when
  its balance is zero.
- `scripts/deploy.js` rejects an `OWNER_ADDRESS` that is malformed or equal to
  the deployer, and verifies the pending owner after each transfer.
- `deployments/<network>.json` records `owner` and `ownershipPending` so the
  intended owner is auditable. It holds addresses only — no secrets.

## Known history

The first Arc testnet deployment had `AgentRegistry` ownership transferred to the
**TaskEscrow contract address** as a workaround for the authorization bug (fixed
by `authorizedWriters`). `TaskEscrow` has no code path that calls
`transferOwnership`, so registry administration on that deployment is permanently
unreachable and `Reputation.submitReview` can never work. That deployment should
be abandoned rather than repaired — and it is the reason these contracts now use
`Ownable2Step`.
