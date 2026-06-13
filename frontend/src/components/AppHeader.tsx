"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleAlert,
  CircleDollarSign,
  ExternalLink,
  LogOut,
  Menu,
  PanelsTopLeft,
  QrCode,
  Radio,
  ShieldCheck,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { verifyMessage } from "viem";
import { toast } from "sonner";
import { ArcMark } from "@/components/ArcMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortAddress } from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function generateNonce() {
  return (
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
}

function createSiweMessage(address: string, chainId: number, nonce: string) {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Arc Agent Market\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

type EthereumLikeProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

type InjectedWalletProvider = EthereumLikeProvider & {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRabby?: boolean;
  providers?: InjectedWalletProvider[];
};

type WalletOption = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  detect: () => EthereumLikeProvider | null;
};

const navItems = [
  { href: "/agents", label: "Agents" },
  { href: "/register", label: "Register" },
  { href: "/tasks/create", label: "Create task" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const { address, isConnected, setConnected, setDisconnected } =
    useWalletStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);

  useEffect(() => {
    const options: WalletOption[] = [];

    if (typeof window !== "undefined") {
      const eth = window.ethereum as InjectedWalletProvider | undefined;

      if (eth?.isMetaMask) {
        options.push({
          id: "metamask",
          name: "MetaMask",
          description: "Browser extension",
          icon: WalletCards,
          detect: () => eth,
        });
      }

      if (eth?.isCoinbaseWallet) {
        options.push({
          id: "coinbase",
          name: "Coinbase Wallet",
          description: "Browser extension",
          icon: CircleDollarSign,
          detect: () => eth,
        });
      }

      if (eth?.isTrust) {
        options.push({
          id: "trust",
          name: "Trust Wallet",
          description: "Browser extension",
          icon: ShieldCheck,
          detect: () => eth,
        });
      }

      if (eth?.isRabby) {
        options.push({
          id: "rabby",
          name: "Rabby",
          description: "Browser extension",
          icon: PanelsTopLeft,
          detect: () => eth,
        });
      }

      if (eth && options.length === 0) {
        options.push({
          id: "injected",
          name: "Browser Wallet",
          description: "Injected provider",
          icon: Wallet,
          detect: () => eth,
        });
      }

      for (const provider of eth?.providers ?? []) {
        if (
          provider.isMetaMask &&
          !options.some((option) => option.id === "metamask")
        ) {
          options.push({
            id: "metamask",
            name: "MetaMask",
            description: "Browser extension",
            icon: WalletCards,
            detect: () => provider,
          });
        }
        if (
          provider.isCoinbaseWallet &&
          !options.some((option) => option.id === "coinbase")
        ) {
          options.push({
            id: "coinbase",
            name: "Coinbase Wallet",
            description: "Browser extension",
            icon: CircleDollarSign,
            detect: () => provider,
          });
        }
      }
    }

    options.push({
      id: "walletconnect",
      name: "WalletConnect",
      description: "Scan a QR code",
      icon: QrCode,
      detect: () => null,
    });

    queueMicrotask(() => setWalletOptions(options));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("siwe-session");
    if (!saved) return;

    try {
      const session = JSON.parse(saved);
      if (session.address && session.expiresAt > Date.now()) {
        setConnected(session.address, session.chainId || 5042002);
      } else {
        localStorage.removeItem("siwe-session");
      }
    } catch {
      localStorage.removeItem("siwe-session");
    }
  }, [setConnected]);

  const signWithProvider = useCallback(
    async (provider: EthereumLikeProvider, userAddress: string) => {
      const chainIdRaw = await provider.request({ method: "eth_chainId" });
      const chainId =
        typeof chainIdRaw === "string"
          ? parseInt(chainIdRaw, 16)
          : Number(chainIdRaw);
      const nonce = generateNonce();
      const message = createSiweMessage(userAddress, chainId, nonce);

      const signatureRaw = await provider.request({
        method: "personal_sign",
        params: [message, userAddress],
      });
      if (typeof signatureRaw !== "string") {
        throw new Error("Wallet returned an invalid signature.");
      }

      const isValid = await verifyMessage({
        message,
        signature: signatureRaw as `0x${string}`,
        address: userAddress as `0x${string}`,
      });

      if (!isValid) throw new Error("Signature verification failed.");

      localStorage.setItem(
        "siwe-session",
        JSON.stringify({
          address: userAddress,
          chainId,
          nonce,
          signature: signatureRaw,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }),
      );
      setConnected(userAddress, chainId);
    },
    [setConnected],
  );

  const handleWalletSelect = useCallback(
    async (option: WalletOption) => {
      setError("");
      setIsSigningIn(true);
      setShowModal(false);

      try {
        if (option.id === "walletconnect") {
          const { EthereumProvider } = await import(
            "@walletconnect/ethereum-provider"
          );
          const wcProvider = await EthereumProvider.init({
            projectId: "c4f79cc821944d9680842e34466bfb",
            chains: [5042002],
            showQrModal: true,
            qrModalOptions: {
              themeMode: "dark",
              themeVariables: {
                "--wcm-z-index": "9999",
              },
            },
            metadata: {
              name: "Arc Agent Market",
              description: "Verified autonomous work on Arc",
              url: window.location.origin,
              icons: [`${window.location.origin}/favicon.ico`],
            },
          });

          await wcProvider.connect();
          const accounts = (await wcProvider.request({
            method: "eth_accounts",
          })) as string[];
          if (!accounts?.length) throw new Error("No accounts returned.");
          await signWithProvider(
            wcProvider as EthereumLikeProvider,
            accounts[0],
          );
        } else {
          const provider = option.detect();
          if (!provider) throw new Error(`${option.name} was not detected.`);
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          if (!accounts?.length) throw new Error("No accounts returned.");
          await signWithProvider(provider, accounts[0]);
        }
      } catch (walletError: unknown) {
        const message =
          walletError instanceof Error
            ? walletError.message
            : "Connection failed.";
        console.error("Wallet connect failed:", walletError);
        setError(message);
        setShowModal(true);
        toast.error("Wallet connection failed", { description: message });
      } finally {
        setIsSigningIn(false);
      }
    },
    [signWithProvider],
  );

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem("siwe-session");
    setDisconnected();
    toast.success("Wallet disconnected");
  }, [setDisconnected]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass-surface mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-primary"
            >
              <ArcMark />
              <span className="truncate text-sm font-semibold text-foreground">
                Arc Agent Market
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "font-medium text-muted-foreground shadow-none",
                      active && "bg-accent text-foreground",
                    )}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border-r border-border/60 pr-3 lg:flex">
              <Radio className="size-3.5 text-[#6eb8ad]" aria-hidden="true" />
              <span className="font-mono text-[10px] text-muted-foreground">
                Arc Testnet
              </span>
            </div>

            {isConnected ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="font-mono text-xs text-muted-foreground">
                  {shortAddress(address ?? "")}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={handleDisconnect}
                      aria-label="Disconnect wallet"
                    >
                      <LogOut aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Disconnect wallet</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Button
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setShowModal(true)}
                disabled={isSigningIn}
              >
                <Wallet aria-hidden="true" />
                {isSigningIn ? "Signing..." : "Connect wallet"}
              </Button>
            )}

            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[min(88vw,22rem)]">
                <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <ArcMark className="text-primary" />
                    Arc Agent Market
                  </SheetTitle>
                  <SheetDescription>
                    Verified autonomous work on Arc.
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex min-h-10 items-center border border-transparent px-3 text-sm text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                          pathname === item.href &&
                            "border-border bg-accent text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto border-t border-border/60 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Radio
                      className="size-3.5 text-[#6eb8ad]"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      Arc Testnet
                    </span>
                  </div>
                  {isConnected ? (
                    <div className="space-y-3">
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {address}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          handleDisconnect();
                          setIsMobileOpen(false);
                        }}
                      >
                        <LogOut aria-hidden="true" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setIsMobileOpen(false);
                        setShowModal(true);
                      }}
                      disabled={isSigningIn}
                    >
                      <Wallet aria-hidden="true" />
                      Connect wallet
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect wallet</DialogTitle>
            <DialogDescription>
              Sign a message to verify wallet ownership. No transaction or gas
              fee is required.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex gap-3 border border-[#d36c72]/55 bg-[#d36c72]/10 p-3 text-sm text-[#efa2a7]">
              <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            {walletOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
                  onClick={() => handleWalletSelect(option)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-secondary text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">
                      {option.name}
                    </span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>

          <a
            href="https://metamask.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Need a browser wallet? Get MetaMask
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
