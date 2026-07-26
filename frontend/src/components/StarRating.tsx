"use client";

import { Star } from "lucide-react";
import { MAX_RATING } from "@/lib/review";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** Whole stars, 1-5. */
  value: number;
  /** Omit to render a read-only display. */
  onChange?: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Star rating, interactive when `onChange` is supplied.
 *
 * The interactive form is a radio group rather than buttons: a rating is one
 * choice among five, so arrow keys should move between stars and the whole
 * control should be a single tab stop.
 */
export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: StarRatingProps) {
  const starClass = size === "sm" ? "size-3.5" : "size-6";
  const stars = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

  if (!onChange) {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5", className)}
        role="img"
        aria-label={`${value} out of ${MAX_RATING} stars`}
      >
        {stars.map((star) => (
          <Star
            key={star}
            aria-hidden="true"
            className={cn(
              starClass,
              star <= value
                ? "fill-[var(--accent-gold)] text-[var(--accent-gold)]"
                : "text-muted-foreground/40",
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Rating"
    >
      {stars.map((star) => {
        const selected = star === value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            disabled={disabled}
            // Only the selected star is tabbable, so the group is one tab stop.
            tabIndex={selected || (value === 0 && star === 1) ? 0 : -1}
            onClick={() => onChange(star)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange(Math.min(MAX_RATING, (value || 0) + 1));
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(Math.max(1, (value || 1) - 1));
              }
            }}
            className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)] disabled:pointer-events-none disabled:opacity-50"
          >
            <Star
              aria-hidden="true"
              className={cn(
                starClass,
                star <= value
                  ? "fill-[var(--accent-gold)] text-[var(--accent-gold)]"
                  : "text-muted-foreground/50",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
