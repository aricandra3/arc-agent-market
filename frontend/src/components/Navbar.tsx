'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { verifyMessage } from 'viem';

function generateNonce() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

function createSiweMessage(address: string, chainId: number, nonce: string) {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Arc Agent Market\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

// Wallet providers
type WalletOption = {
  id: string;
  name: string;
  icon: string;
  detect: () => any; // returns provider or null
};

export default function Navbar() {
  const { address, isConnected, setConnected, setDisconnected } = useWalletStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);

  // Detect available wallets on mount
  useEffect(() => {
    const options: WalletOption[] = [];

    if (typeof window !== 'undefined') {
      const eth = (window as any).ethereum;

      // MetaMask
      if (eth?.isMetaMask) {
        options.push({
          id: 'metamask',
          name: 'MetaMask',
          icon: '🦊',
          detect: () => eth,
        });
      }

      // Coinbase Wallet
      if (eth?.isCoinbaseWallet) {
        options.push({
          id: 'coinbase',
          name: 'Coinbase Wallet',
          icon: '🔵',
          detect: () => eth,
        });
      }

      // Trust Wallet
      if (eth?.isTrust) {
        options.push({
          id: 'trust',
          name: 'Trust Wallet',
          icon: '🛡️',
          detect: () => eth,
        });
      }

      // Rabby
      if (eth?.isRabby) {
        options.push({
          id: 'rabby',
          name: 'Rabby',
          icon: '🐰',
          detect: () => eth,
        });
      }

      // Generic injected (if no specific wallet detected but ethereum exists)
      if (eth && options.length === 0) {
        options.push({
          id: 'injected',
          name: 'Browser Wallet',
          icon: '💼',
          detect: () => eth,
        });
      }

      // If multiple providers, detect via EIP-6963
      if (eth?.providers?.length > 0) {
        for (const p of eth.providers) {
          if (p.isMetaMask && !options.find(o => o.id === 'metamask')) {
            options.push({ id: 'metamask', name: 'MetaMask', icon: '🦊', detect: () => p });
          }
          if (p.isCoinbaseWallet && !options.find(o => o.id === 'coinbase')) {
            options.push({ id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', detect: () => p });
          }
        }
      }
    }

    // Always add WalletConnect as fallback (works with QR, no extension needed)
    options.push({
      id: 'walletconnect',
      name: 'WalletConnect (QR)',
      icon: '📱',
      detect: () => null, // handled separately
    });

    setWalletOptions(options);
  }, []);

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem('siwe-session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.address && session.expiresAt > Date.now()) {
          setConnected(session.address, session.chainId || 5042002);
        } else {
          localStorage.removeItem('siwe-session');
        }
      } catch (e) {
        localStorage.removeItem('siwe-session');
      }
    }
  }, [setConnected]);

  const signWithProvider = useCallback(async (provider: any, userAddress: string) => {
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    const nonce = generateNonce();
    const message = createSiweMessage(userAddress, chainId, nonce);

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, userAddress],
    });

    const isValid = await verifyMessage({
      message,
      signature: signature as `0x${string}`,
      address: userAddress as `0x${string}`,
    });

    if (!isValid) throw new Error('Signature verification failed.');

    const session = {
      address: userAddress,
      chainId,
      nonce,
      signature,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem('siwe-session', JSON.stringify(session));
    setConnected(userAddress, chainId);
  }, [setConnected]);

  const handleWalletSelect = useCallback(async (option: WalletOption) => {
    setError('');
    setIsSigningIn(true);
    setShowModal(false);

    try {
      if (option.id === 'walletconnect') {
        // WalletConnect flow
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const wcProvider = await EthereumProvider.init({
          projectId: 'c4f79cc821944d9680842e34466bfb', // Free public projectId
          chains: [5042002],
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-z-index': '9999',
            },
          },
          metadata: {
            name: 'Arc Agent Market',
            description: 'The Autonomous Agent Economy',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
        });

        // Subscribe to session event
        wcProvider.on('display_uri', async (uri: string) => {
          console.log('WalletConnect URI:', uri);
        });

        // This will show QR modal
        await wcProvider.connect();

        const accounts = await wcProvider.request({ method: 'eth_accounts' }) as string[];
        if (!accounts || accounts.length === 0) throw new Error('No accounts');

        await signWithProvider(wcProvider, accounts[0]);
      } else {
        // Injected wallet flow
        const provider = option.detect();
        if (!provider) throw new Error(`${option.name} not detected`);

        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

        await signWithProvider(provider, accounts[0]);
      }
    } catch (err: any) {
      console.error('Wallet connect failed:', err);
      setError(err.message || 'Connection failed');
    } finally {
      setIsSigningIn(false);
    }
  }, [signWithProvider]);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem('siwe-session');
    setDisconnected();
  }, [setDisconnected]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-white">
                <span className="text-blue-400">Arc</span> Agent Market
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/agents" className="text-slate-300 hover:text-white transition-colors">Agents</Link>
                <Link href="/register" className="text-slate-300 hover:text-white transition-colors">Register</Link>
                <Link href="/tasks/create" className="text-slate-300 hover:text-white transition-colors">Create Task</Link>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {error && <span className="text-xs text-red-400 max-w-[200px] truncate">{error}</span>}
              {isConnected ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button onClick={handleDisconnect} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  disabled={isSigningIn}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  {isSigningIn ? 'Signing...' : '🔗 Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <p className="text-sm text-slate-400 mb-6">
              Sign in with Ethereum to verify your wallet ownership. Works with any Web3 wallet.
            </p>

            <div className="space-y-3">
              {walletOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleWalletSelect(option)}
                  className="w-full flex items-center gap-4 px-4 py-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-blue-500/50 rounded-xl transition-all text-left"
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="text-white font-medium">{option.name}</div>
                    <div className="text-xs text-slate-500">
                      {option.id === 'walletconnect' ? 'Scan QR with any wallet' : 'Browser extension'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-600">
                Don't have a wallet?{' '}
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                  Get MetaMask
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
