"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleAlert,
  ExternalLink,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  Radio,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ExAgoraMark } from "@/components/ExAgoraMark";
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
import { BRAND } from "@/lib/brand";
import { arcTestnet, shortAddress } from "@/lib/contracts";
import {
  clearSession,
  loadSession,
  signInWithEthereum,
  type Eip1193Provider,
} from "@/lib/siwe";
import {
  useInjectedWallets,
  type DiscoveredWallet,
} from "@/lib/useInjectedWallets";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "c4f79cc821944d9680842e34466bfb";

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
  const injectedWallets = useInjectedWallets();

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [activeProvider, setActiveProvider] = useState<Eip1193Provider | null>(
    null,
  );

  const isConnecting = connectingId !== null;
  const hasLegacyInjected =
    typeof window !== "undefined" && Boolean(window.ethereum);

  const handleDisconnect = useCallback(() => {
    clearSession();
    setActiveProvider(null);
    setDisconnected();
  }, [setDisconnected]);

  // Restore a previous SIWE session on load.
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setConnected(session.address, session.chainId);
    if (typeof window === "undefined" || !window.ethereum) return;
    const provider = window.ethereum as unknown as Eip1193Provider;
    const frame = requestAnimationFrame(() => setActiveProvider(provider));
    return () => cancelAnimationFrame(frame);
  }, [setConnected]);

  // Live wallet events — react to account/chain changes from the wallet.
  useEffect(() => {
    if (!activeProvider?.on) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      if (accounts.length === 0) {
        handleDisconnect();
        toast.message("Wallet disconnected");
      } else {
        handleDisconnect();
        toast.message("Account changed — please reconnect to continue.");
      }
    };
    const onChainChanged = (...args: unknown[]) => {
      const hexId = args[0] as string;
      const state = useWalletStore.getState();
      if (state.address) {
        state.setConnected(state.address, parseInt(hexId, 16));
      }
    };
    const onDisconnect = () => handleDisconnect();

    activeProvider.on("accountsChanged", onAccountsChanged);
    activeProvider.on("chainChanged", onChainChanged);
    activeProvider.on("disconnect", onDisconnect);

    return () => {
      activeProvider.removeListener?.("accountsChanged", onAccountsChanged);
      activeProvider.removeListener?.("chainChanged", onChainChanged);
      activeProvider.removeListener?.("disconnect", onDisconnect);
    };
  }, [activeProvider, handleDisconnect]);

  const runSignIn = useCallback(
    async (provider: Eip1193Provider, id: string, label: string) => {
      setError("");
      setConnectingId(id);
      try {
        const session = await signInWithEthereum(provider);
        setActiveProvider(provider);
        setConnected(session.address, session.chainId);
        setShowModal(false);
        toast.success(`Connected with ${label}`, {
          description: shortAddress(session.address),
        });
      } catch (signInError: unknown) {
        const code = (signInError as { code?: number })?.code;
        const message =
          code === 4001
            ? "Signature request was rejected."
            : signInError instanceof Error
              ? signInError.message
              : "Connection failed.";
        console.error("Wallet sign-in failed:", signInError);
        setError(message);
        setShowModal(true);
        toast.error("Wallet connection failed", { description: message });
      } finally {
        setConnectingId(null);
      }
    },
    [setConnected],
  );

  const connectInjected = useCallback(
    (wallet: DiscoveredWallet) =>
      runSignIn(wallet.provider, wallet.info.rdns, wallet.info.name),
    [runSignIn],
  );

  const connectLegacy = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No browser wallet detected.");
      return;
    }
    runSignIn(
      window.ethereum as unknown as Eip1193Provider,
      "legacy",
      "Browser wallet",
    );
  }, [runSignIn]);

  const connectWalletConnect = useCallback(async () => {
    setError("");
    setConnectingId("walletconnect");
    try {
      const { EthereumProvider } = await import(
        "@walletconnect/ethereum-provider"
      );
      const wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [arcTestnet.id],
        optionalChains: [1, 8453, 137, 42161],
        showQrModal: true,
        qrModalOptions: { themeMode: "dark" },
        metadata: {
          name: BRAND.name,
          description: BRAND.descriptor,
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
      });
      await wcProvider.connect();
      await runSignIn(
        wcProvider as unknown as Eip1193Provider,
        "walletconnect",
        "WalletConnect",
      );
    } catch (wcError: unknown) {
      const message =
        wcError instanceof Error ? wcError.message : "Connection failed.";
      console.error("WalletConnect failed:", wcError);
      setError(message);
      setConnectingId(null);
      toast.error("WalletConnect failed", { description: message });
    }
  }, [runSignIn]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass-surface mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-primary"
            >
              <ExAgoraMark />
              <span className="truncate text-sm font-semibold text-foreground">
                {BRAND.name}
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
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Wallet aria-hidden="true" />
                )}
                {isConnecting ? "Connecting..." : "Connect wallet"}
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
                    <ExAgoraMark className="text-primary" />
                    {BRAND.name}
                  </SheetTitle>
                  <SheetDescription>{BRAND.descriptor}</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex min-h-10 items-center rounded-[0.65rem] border border-transparent px-3 text-sm text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
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
                      disabled={isConnecting}
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
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Pick any EVM wallet and sign a gas-free message to prove ownership
              (Sign-In with Ethereum). No transaction is sent.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex gap-3 rounded-[0.65rem] border border-[#d36c72]/55 bg-[#d36c72]/10 p-3 text-sm text-[#efa2a7]">
              <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            {injectedWallets.map((wallet) => (
              <WalletOptionButton
                key={wallet.info.uuid}
                name={wallet.info.name}
                subtitle="Browser extension"
                loading={connectingId === wallet.info.rdns}
                disabled={isConnecting}
                onClick={() => connectInjected(wallet)}
                iconUrl={wallet.info.icon}
              />
            ))}

            {injectedWallets.length === 0 && hasLegacyInjected && (
              <WalletOptionButton
                name="Browser wallet"
                subtitle="Injected provider"
                loading={connectingId === "legacy"}
                disabled={isConnecting}
                onClick={connectLegacy}
                icon={<Wallet className="size-4" aria-hidden="true" />}
              />
            )}

            <WalletOptionButton
              name="WalletConnect"
              subtitle="Scan with a mobile wallet"
              loading={connectingId === "walletconnect"}
              disabled={isConnecting}
              onClick={connectWalletConnect}
              icon={<QrCode className="size-4" aria-hidden="true" />}
            />
          </div>

          {injectedWallets.length === 0 && !hasLegacyInjected && (
            <a
              href="https://ethereum.org/en/wallets/find-wallet/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              No wallet detected? Find an EVM wallet
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function WalletOptionButton({
  name,
  subtitle,
  loading,
  disabled,
  onClick,
  iconUrl,
  icon,
}: {
  name: string;
  subtitle: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  iconUrl?: string;
  icon?: ReactNode;
}) {
  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.6rem] border border-border bg-secondary text-primary">
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-5 object-contain" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{name}</span>
        <span className="block text-xs font-normal text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Button>
  );
}
