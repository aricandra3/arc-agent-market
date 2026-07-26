"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRACTS,
  REPUTATION_ABI,
  formatDate,
  readContract,
  shortAddress,
} from "@/lib/contracts";
import { describeReadError } from "@/lib/rpc";

type Review = {
  id: bigint;
  reviewer: string;
  rating: number;
  comment: string;
  taskId: bigint;
  createdAt: bigint;
};

const PAGE_SIZE = 5;

/**
 * Reviews written about an agent.
 *
 * `getReviews` returns parallel arrays rather than structs, and its pages are
 * oldest-first, so a page is reversed for display.
 */
export function ReviewList({ agent }: { agent: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchPage = useCallback(
    async (count: number, alreadyLoaded: number): Promise<Review[]> => {
      // Newest first: walk the tail of the list backwards.
      const end = count - alreadyLoaded;
      const offset = Math.max(0, end - PAGE_SIZE);
      const limit = end - offset;
      if (limit <= 0) return [];

      const page = await readContract({
        address: CONTRACTS.REPUTATION,
        abi: REPUTATION_ABI,
        functionName: "getReviews",
        args: [agent as `0x${string}`, BigInt(offset), BigInt(limit)],
      });

      const [ids, reviewers, ratings, comments, taskIds, createdAts] = page;
      return ids
        .map((id, index) => ({
          id,
          reviewer: reviewers[index],
          rating: Number(ratings[index]),
          comment: comments[index],
          taskId: taskIds[index],
          createdAt: createdAts[index],
        }))
        .reverse();
    },
    [agent],
  );

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        const count = Number(
          await readContract({
            address: CONTRACTS.REPUTATION,
            abi: REPUTATION_ABI,
            functionName: "getReviewCount",
            args: [agent as `0x${string}`],
          }),
        );
        if (!isCurrent) return;
        setTotal(count);

        if (count === 0) {
          setReviews([]);
          setLoaded(0);
          return;
        }

        const page = await fetchPage(count, 0);
        if (!isCurrent) return;
        setReviews(page);
        setLoaded(page.length);
      } catch (error) {
        console.error("Failed to load reviews:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, [agent, fetchPage]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const page = await fetchPage(total, loaded);
      setReviews((current) => [...current, ...page]);
      setLoaded((current) => current + page.length);
    } catch (error) {
      console.error("Failed to load more reviews:", error);
      setLoadError(describeReadError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-[0.85rem] bg-primary/10" />
        <Skeleton className="h-24 rounded-[0.85rem] bg-primary/10" />
      </div>
    );
  }

  if (loadError && reviews.length === 0) {
    return (
      <p role="alert" className="text-sm leading-6 text-[#efa2a7]">
        {loadError}
      </p>
    );
  }

  if (total === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        No reviews yet. Both parties can rate a task once it settles.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article
          key={review.id.toString()}
          className="rounded-[0.85rem] border border-border/60 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StarRating value={review.rating} size="sm" />
            <span className="font-mono text-[11px] text-muted-foreground">
              {shortAddress(review.reviewer)} · task #{review.taskId.toString()}{" "}
              · {formatDate(review.createdAt)}
            </span>
          </div>
          {review.comment ? (
            <p className="mt-3 text-sm leading-6 text-foreground">
              {review.comment}
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              Rated without a comment
            </p>
          )}
        </article>
      ))}

      {loadError && (
        <p role="alert" className="text-xs text-[#efa2a7]">
          {loadError}
        </p>
      )}

      {loaded < total && (
        <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
          {isLoadingMore
            ? "Loading..."
            : `Load older reviews (${total - loaded} left)`}
        </Button>
      )}
    </div>
  );
}
