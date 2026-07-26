"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  Radio,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ExAgoraMark } from "@/components/ExAgoraMark";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  ensureArcChain,
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
  { href: "/tasks", label: "Tasks" },
  { href: "/verify", label: "Verify" },
  { href: "/register", label: "Register" },
  { href: "/tasks/create", label: "Create task" },
  { href: "/dashboard", label: "Dashboard" },
];

/**
 * The longest matching nav href wins, so `/tasks/create` highlights "Create
 * task" only — not "Tasks" as well.
 */
function activeNavHref(pathname: string): string | null {
  return navItems.reduce<string | null>((best, item) => {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) return best;
    return !best || item.href.length > best.length ? item.href : best;
  }, null);
}

export default function AppHeader() {
  const pathname = usePathname();
  const {
    address,
    chainId,
    isConnected,
    provider: activeProvider,
    walletRdns,
    setConnected,
    setProvider,
    setDisconnected,
  } = useWalletStore();
  const injectedWallets = useInjectedWallets();
  const activeHref = activeNavHref(pathname);

  const wrongNetwork =
    isConnected && chainId !== null && chainId !== arcTestnet.id;

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const isConnecting = connectingId !== null;
  const hasLegacyInjected =
    typeof window !== "undefined" && Boolean(window.ethereum);

  const handleDisconnect = useCallback(() => {
    clearSession();
    setDisconnected();
  }, [setDisconnected]);

  const handleSwitchNetwork = useCallback(async () => {
    if (!activeProvider) {
      toast.message(`Open your wallet and switch to ${arcTestnet.name}.`);
      return;
    }
    await ensureArcChain(activeProvider);
  }, [activeProvider]);

  // Restore a previous SIWE session on load.
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setConnected(
      session.address,
      session.chainId,
      null,
      session.walletRdns ?? null,
    );
  }, [setConnected]);

  // Re-attach the provider once wallet discovery finishes. A session records
  // which wallet signed in (rdns), so a reload reconnects to that exact wallet
  // rather than whichever extension happens to own `window.ethereum`.
  useEffect(() => {
    if (activeProvider || !isConnected) return;

    if (walletRdns) {
      const match = injectedWallets.find(
        (wallet) => wallet.info.rdns === walletRdns,
      );
      if (match) {
        setProvider(match.provider);
      }
      // A WalletConnect session cannot be resumed silently — the user has to
      // reconnect, and every transaction path surfaces that.
      return;
    }

    if (injectedWallets.length === 1) {
      setProvider(injectedWallets[0].provider, injectedWallets[0].info.rdns);
      return;
    }
    if (injectedWallets.length === 0 && typeof window !== "undefined" && window.ethereum) {
      setProvider(window.ethereum as unknown as Eip1193Provider);
    }
  }, [activeProvider, injectedWallets, isConnected, setProvider, walletRdns]);

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
        toast.message("Account changed. Reconnect to continue.");
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
    async (
      provider: Eip1193Provider,
      id: string,
      label: string,
      rdns?: string,
    ) => {
      setError("");
      setConnectingId(id);
      try {
        const session = await signInWithEthereum(provider, rdns);
        setConnected(session.address, session.chainId, provider, rdns ?? null);
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
      runSignIn(
        wallet.provider,
        wallet.info.rdns,
        wallet.info.name,
        wallet.info.rdns,
      ),
    [runSignIn],
  );

  const connectLegacy = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No browser wallet detected.");
      return;
    }
    runSignIn(window.ethereum, "legacy", "Browser wallet");
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
          icons: [`${window.location.origin}/icon.svg`],
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
        <div className="nav-surface mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
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
                const active = activeHref === item.href;
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
            <ThemeToggle />
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 px-2.5 py-1 lg:inline-flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--success)]" />
              </span>
              <span className="font-mono text-[10px] tracking-wide text-[var(--accent-cyan)]">
                {arcTestnet.name}
              </span>
            </span>

            {isConnected ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--success)] px-3 py-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
                  <span className="size-1.5 rounded-full bg-[var(--ink)]" />
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
                    <ExAgoraMark />
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
                          "flex min-h-10 items-center rounded-[var(--radius)] border border-transparent px-3 text-sm text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                          activeHref === item.href &&
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
                      className="size-3.5 text-[var(--success)]"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {arcTestnet.name}
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

        {wrongNetwork && (
          <div
            role="alert"
            className="mx-auto mt-2 flex max-w-7xl flex-col items-start gap-2 rounded-[var(--radius)] border border-[var(--warning)]/50 bg-[var(--tint-warning)]/85 px-4 py-2.5 text-sm text-[var(--warning-fg)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              Wrong network. Switch to {arcTestnet.name} to transact.
            </span>
            <Button
              size="xs"
              variant="outline"
              className="border-[var(--warning)]/55 text-[var(--warning-fg)]"
              onClick={handleSwitchNetwork}
            >
              Switch to {arcTestnet.name}
            </Button>
          </div>
        )}
      </header>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(50%_100%_at_50%_0%,color-mix(in_srgb,var(--accent-cyan)_16%,transparent),transparent_72%)]"
          />
          <DialogHeader className="relative">
            <span
              className="sticker-chip mb-3 w-fit"
              style={{ ["--chip-bg" as string]: "var(--accent-cyan)" }}
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Gas-free · SIWE
            </span>
            <DialogTitle className="font-display flex items-center gap-3 text-2xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--ink)] bg-[var(--accent-cyan)] text-[var(--ink)]">
                <Wallet className="size-5" aria-hidden="true" />
              </span>
              Connect a wallet
            </DialogTitle>
            <DialogDescription className="text-sm">
              Pick any EVM wallet and sign a message to prove ownership. No
              transaction or gas fee.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="relative flex gap-3 rounded-[var(--radius)] border border-[var(--destructive)]/55 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive-fg)]">
              <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <div className="relative space-y-2">
            {injectedWallets.map((wallet) => (
              <WalletOptionButton
                key={wallet.info.uuid}
                name={wallet.info.name}
                subtitle="Browser extension"
                loading={connectingId === wallet.info.rdns}
                disabled={isConnecting}
                onClick={() => connectInjected(wallet)}
                iconUrl={wallet.info.icon}
                detected
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
                accent="var(--accent-cyan)"
                detected
              />
            )}

            <WalletOptionButton
              name="WalletConnect"
              subtitle="Scan with a mobile wallet"
              loading={connectingId === "walletconnect"}
              disabled={isConnecting}
              onClick={connectWalletConnect}
              icon={<QrCode className="size-4" aria-hidden="true" />}
              accent="var(--accent-azure)"
            />
          </div>

          {injectedWallets.length === 0 && !hasLegacyInjected ? (
            <a
              href="https://ethereum.org/en/wallets/find-wallet/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              No wallet detected? Find an EVM wallet
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : (
            <div className="relative flex items-center gap-2 rounded-[var(--radius)] border border-border/50 bg-[var(--surface-deep)]/60 px-3 py-2.5 text-[11px] text-muted-foreground">
              <ShieldCheck
                className="size-3.5 shrink-0 text-[var(--success)]"
                aria-hidden="true"
              />
              Signing is free and only proves wallet ownership. Your keys never
              leave your wallet.
            </div>
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
  accent,
  detected = false,
}: {
  name: string;
  subtitle: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  iconUrl?: string;
  icon?: ReactNode;
  accent?: string;
  detected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group/wallet flex w-full items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-[var(--surface-deep)]/60 px-3.5 py-3 text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-px hover:border-[var(--accent-cyan)]/50 focus-visible:border-[var(--accent-cyan)]/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
    >
      <span
        className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border border-[var(--ink)] text-[var(--ink)]"
        style={{ background: accent ?? "var(--surface-strong)" }}
      >
        {loading ? (
          <Loader2
            className={accent ? "size-4 animate-spin" : "size-4 animate-spin text-[var(--muted-foreground)]"}
            aria-hidden="true"
          />
        ) : iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="size-6 object-contain" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {name}
          {detected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/15 px-1.5 py-px text-[9px] font-medium tracking-wide text-[var(--accent-cyan)] uppercase">
              <span className="size-1 rounded-full bg-[var(--success)]" />
              Detected
            </span>
          )}
        </span>
        <span className="block text-xs font-normal text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/wallet:translate-x-0.5 group-hover/wallet:text-[var(--accent-cyan)]"
        aria-hidden="true"
      />
    </button>
  );
}
