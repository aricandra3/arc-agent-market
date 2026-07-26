'use client';

import type { Hash, TransactionReceipt } from 'viem';
import { arcTestnet, publicClient } from '@/lib/contracts';
import type { Eip1193Provider } from '@/lib/siwe';
import { useWalletStore } from '@/lib/store';

/**
 * Transaction plumbing. Every write goes through the provider the user signed
 * in with (stored in the wallet store), never through `window.ethereum` — that
 * global is whichever extension won the injection race and is undefined for
 * WalletConnect sessions.
 */

export class WalletNotConnectedError extends Error {
  constructor() {
    super('Connect a wallet before sending a transaction.');
    this.name = 'WalletNotConnectedError';
  }
}

export class WrongNetworkError extends Error {
  constructor(chainId: number | null) {
    super(
      `Wallet is on chain ${chainId ?? 'unknown'}. Switch to ${arcTestnet.name} (${arcTestnet.id}) to transact.`,
    );
    this.name = 'WrongNetworkError';
  }
}

export class TransactionRevertedError extends Error {
  readonly hash: Hash;

  constructor(hash: Hash) {
    super('The transaction was mined but reverted on chain.');
    this.name = 'TransactionRevertedError';
    this.hash = hash;
  }
}

type SendTransactionArgs = {
  to: string;
  data: string;
  value?: string;
};

/** Resolves the provider for the current session, if any. */
export function getActiveProvider(): Eip1193Provider | null {
  return useWalletStore.getState().provider;
}

/**
 * Submits a transaction and returns its hash. Does not wait for confirmation —
 * pair with {@link waitForTx}, or use {@link sendAndWait}.
 */
export async function sendTransaction({
  to,
  data,
  value,
}: SendTransactionArgs): Promise<Hash> {
  const { address, chainId, provider } = useWalletStore.getState();

  if (!provider || !address) throw new WalletNotConnectedError();
  if (chainId !== null && chainId !== arcTestnet.id) {
    throw new WrongNetworkError(chainId);
  }

  const hash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: address,
        to,
        data,
        value: value || '0x0',
      },
    ],
  })) as Hash;

  if (typeof hash !== 'string') {
    throw new Error('Wallet returned an invalid transaction hash.');
  }

  return hash;
}

/**
 * Waits for a transaction to be mined. Throws {@link TransactionRevertedError}
 * when the receipt says the transaction reverted, so callers do not report an
 * on-chain failure as success.
 */
export async function waitForTx(hash: Hash): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    // Arc has fast deterministic finality; one confirmation is enough.
    confirmations: 1,
  });

  if (receipt.status === 'reverted') throw new TransactionRevertedError(hash);
  return receipt;
}

export async function sendAndWait(args: SendTransactionArgs): Promise<{
  hash: Hash;
  receipt: TransactionReceipt;
}> {
  const hash = await sendTransaction(args);
  return { hash, receipt: await waitForTx(hash) };
}

/** Human-readable message for any error thrown by the flows above. */
export function describeTxError(error: unknown): string {
  if (error instanceof WalletNotConnectedError) return error.message;
  if (error instanceof WrongNetworkError) return error.message;
  if (error instanceof TransactionRevertedError) return error.message;

  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'The wallet transaction was cancelled.';
  }
  if (lower.includes('insufficient funds')) {
    return 'Insufficient USDC balance to cover the transaction and gas.';
  }
  return message || 'The transaction failed.';
}
