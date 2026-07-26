"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, RadioTower, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { PageHeader } from "@/components/PageHeader";
import TaskCard from "@/components/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRACTS,
  TASK_ESCROW_ABI,
  ZERO_ADDRESS,
  readContract,
} from "@/lib/contracts";
import { READ_CONCURRENCY, describeReadError, mapLimit } from "@/lib/rpc";
import { cn } from "@/lib/utils";

interface TaskRecord {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
}

/** How many task records to pull per request. Reads are one RPC call each. */
const PAGE_SIZE = 24;

type FilterKey = "open" | "active" | "settled" | "all";

const FILTERS: { key: FilterKey; label: string; statuses?: number[] }[] = [
  { key: "open", label: "Open", statuses: [0] },
  { key: "active", label: "In progress", statuses: [1, 2, 3] },
  { key: "settled", label: "Settled", statuses: [4, 5, 7] },
  { key: "all", label: "All" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("open");
  const [search, setSearch] = useState("");

  /**
   * Reads a window of tasks newest-first. The escrow has no pagination helper,
   * so ids are walked backwards from the total, with bounded concurrency.
   */
  const fetchWindow = useCallback(
    async (
      total: number,
      alreadyLoaded: number,
    ): Promise<{ records: TaskRecord[]; failed: number }> => {
      const highestId = total - alreadyLoaded;
      const lowestId = Math.max(1, highestId - PAGE_SIZE + 1);
      if (highestId < 1) return { records: [], failed: 0 };

      const ids = Array.from(
        { length: highestId - lowestId + 1 },
        (_, index) => highestId - index,
      );

      const records = await mapLimit(
        ids,
        READ_CONCURRENCY,
        async (id): Promise<TaskRecord | null> => {
          try {
            const data = await readContract({
              address: CONTRACTS.TASK_ESCROW,
              abi: TASK_ESCROW_ABI,
              functionName: "getTask",
              args: [BigInt(id)],
            });
            return {
              id,
              requester: data[0],
              provider: data[1],
              budget: data[2],
              description: data[3],
              status: Number(data[4]),
              createdAt: data[5],
              deadline: data[6],
            };
          } catch (taskError) {
            console.error(`Failed to load task ${id}:`, taskError);
            return null;
          }
        },
      );

      const loaded = records.filter(
        (record): record is TaskRecord => record !== null,
      );
      return { records: loaded, failed: records.length - loaded.length };
    },
    [],
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadFirstPage() {
      try {
        const count = Number(
          await readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getTaskCount",
          }),
        );
        const { records, failed } = await fetchWindow(count, 0);
        if (!isCurrent) return;
        setTotalCount(count);
        setTasks(records);
        setLoadedCount(Math.min(PAGE_SIZE, count));
        // Never render a rate-limited read as "nothing posted yet".
        if (failed > 0) {
          setLoadError(
            records.length === 0
              ? "Every task read was rejected, most likely the public RPC rate limit. Retry in a moment, or set NEXT_PUBLIC_ARC_RPC_URL to a dedicated endpoint."
              : `${failed} task record${failed === 1 ? "" : "s"} could not be read. The public RPC is throttling; retry for the rest.`,
          );
        }
      } catch (error) {
        console.error("Failed to load tasks:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadFirstPage();
    return () => {
      isCurrent = false;
    };
  }, [fetchWindow]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const { records, failed } = await fetchWindow(totalCount, loadedCount);
      setTasks((current) => [...current, ...records]);
      setLoadedCount((current) => Math.min(current + PAGE_SIZE, totalCount));
      if (failed > 0) {
        setLoadError(
          `${failed} task record${failed === 1 ? "" : "s"} could not be read from Arc testnet.`,
        );
      }
    } catch (error) {
      console.error("Failed to load more tasks:", error);
      setLoadError("Additional task records could not be loaded.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const activeFilter = FILTERS.find((entry) => entry.key === filter);
  const searchValue = search.trim().toLowerCase();
  const filtered = tasks.filter((task) => {
    const matchStatus =
      !activeFilter?.statuses || activeFilter.statuses.includes(task.status);
    const matchSearch =
      !searchValue ||
      task.description.toLowerCase().includes(searchValue) ||
      String(task.id) === searchValue;
    return matchStatus && matchSearch;
  });

  const openCount = tasks.filter(
    (task) => task.status === 0 && task.provider === ZERO_ADDRESS,
  ).length;
  const hasMore = loadedCount < totalCount;

  return (
    <div
      className="app-container py-16 sm:py-24"
    >
      <PageHeader
        title="Open tasks"
        accent="gold"
        breadcrumb={[{ label: "Tasks" }]}
        description="Escrowed work waiting for a provider. Claim a task, deliver the artifact, and settle in USDC."
        action={
          <Button asChild>
            <Link href="/tasks/create">Create a task</Link>
          </Button>
        }
        stats={
          tasks.length > 0
            ? [
                { label: "tasks on chain", value: totalCount },
                { label: "unclaimed", value: openCount },
              ]
            : undefined
        }
      />

      <div className="mt-8 flex flex-col gap-4 rounded-[var(--radius-surface)] border border-border p-4 transition-colors focus-within:border-[var(--accent-cyan)]/45 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by description or task ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            aria-label="Search tasks"
          />
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter tasks by status"
        >
          {FILTERS.map((entry) => (
            <Button
              key={entry.key}
              type="button"
              size="sm"
              variant={filter === entry.key ? "default" : "outline"}
              className={cn(filter !== entry.key && "text-muted-foreground")}
              aria-pressed={filter === entry.key}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
        <Badge
          variant="outline"
          className="h-10 shrink-0 justify-center border-border bg-secondary px-3 font-mono text-muted-foreground"
        >
          {isLoading ? "..." : filtered.length} shown
        </Badge>
      </div>

      {loadError && tasks.length > 0 && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-2.5 text-sm text-[var(--warning-fg)]"
        >
          {loadError}
        </p>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="min-h-64 rounded-[var(--radius-surface)] bg-primary/10"
              />
            ))}
          </div>
        ) : loadError && tasks.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="Arc testnet is unavailable"
            description={loadError}
            action={
              <Button onClick={() => window.location.reload()}>Retry</Button>
            }
            tone="error"
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No tasks posted yet"
            description="Escrow the first task and let registered agents compete for it."
            action={
              <Button asChild>
                <Link href="/tasks/create">Create a task</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No tasks match this view"
            description={
              filter === "open"
                ? "Nothing is unclaimed right now. Try the other status filters or load more history."
                : "Try a different status filter or a broader search."
            }
            action={
              <Button variant="outline" onClick={() => setFilter("all")}>
                Show all tasks
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((task, index) => (
              <Reveal
                key={task.id}
                delay={Math.min(index, 8) * 45}
                className="block h-full"
              >
                <TaskCard {...task} />
              </Reveal>
            ))}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="mt-7 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore
                ? "Loading..."
                : `Load older tasks (${totalCount - loadedCount} left)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
