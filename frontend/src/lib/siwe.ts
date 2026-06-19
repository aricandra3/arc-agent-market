import { getAddress, verifyMessage } from "viem";
import { arcTestnet, publicClient } from "@/lib/contracts";
import { BRAND } from "@/lib/brand";

/** Minimal EIP-1193 provider surface used for sign-in. */
export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

export type SiweSession = {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  signature: string;
  issuedAt: string;
  expiresAt: number;
};

const SESSION_KEY = "siwe-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const STATEMENT = `Sign in to ${BRAND.name}. This is a gas-free signature that only proves you own this wallet.`;

export function generateNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return (
    Math.random().toString(36).slice(2, 12) +
    Math.random().toString(36).slice(2, 12)
  );
}

/** Build an EIP-4361 (Sign-In With Ethereum) message. */
export function buildSiweMessage(params: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}) {
  const { domain, address, uri, chainId, nonce, issuedAt } = params;
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    STATEMENT,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

function toNumericChainId(raw: unknown): number {
  if (typeof raw === "string") {
    return raw.startsWith("0x") ? parseInt(raw, 16) : Number(raw);
  }
  return Number(raw);
}

/**
 * Best-effort switch to Arc Testnet. Adds the chain if the wallet doesn't
 * know it. Never throws — wallets that reject just stay on their network.
 */
export async function ensureArcChain(provider: Eip1193Provider) {
  const hexId = `0x${arcTestnet.id.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    // 4902 / -32603: chain not added yet — try to add it.
    if (code === 4902 || code === -32603) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: arcTestnet.name,
              nativeCurrency: arcTestnet.nativeCurrency,
              rpcUrls: arcTestnet.rpcUrls.default.http,
              blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
            },
          ],
        });
      } catch {
        /* user declined — ignore */
      }
    }
  }
}

async function verifySignature(
  address: `0x${string}`,
  message: string,
  signature: `0x${string}`,
) {
  // EOA path (offline, fast).
  try {
    if (await verifyMessage({ address, message, signature })) return true;
  } catch {
    /* fall through to contract verification */
  }
  // Smart-contract wallet path (ERC-1271 / ERC-6492) via on-chain check.
  try {
    return await publicClient.verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}

/**
 * Run the full SIWE handshake against a provider:
 * request accounts → (best-effort) switch to Arc → sign → verify → persist.
 */
export async function signInWithEthereum(
  provider: Eip1193Provider,
): Promise<SiweSession> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.length) throw new Error("No accounts returned by the wallet.");

  const address = getAddress(accounts[0]);

  await ensureArcChain(provider);

  const chainId = toNumericChainId(
    await provider.request({ method: "eth_chainId" }),
  );
  const nonce = generateNonce();
  const issuedAt = new Date().toISOString();
  const message = buildSiweMessage({
    domain: window.location.host,
    address,
    uri: window.location.origin,
    chainId,
    nonce,
    issuedAt,
  });

  const signature = (await provider.request({
    method: "personal_sign",
    params: [message, address],
  })) as `0x${string}`;

  if (typeof signature !== "string") {
    throw new Error("Wallet returned an invalid signature.");
  }

  const valid = await verifySignature(address, message, signature);
  if (!valid) throw new Error("Signature verification failed.");

  const session: SiweSession = {
    address,
    chainId,
    nonce,
    signature,
    issuedAt,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  saveSession(session);
  return session;
}

export function saveSession(session: SiweSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): SiweSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SiweSession;
    if (!session.address || session.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
