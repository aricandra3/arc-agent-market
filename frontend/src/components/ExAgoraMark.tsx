import { cn } from "@/lib/utils";

/**
 * Amber of the proof seal, taken from the supplied logo. Deliberately brighter
 * than `--accent-gold`, and deliberately constant across themes: it is the one
 * fixed point of the mark.
 */
const SEAL = "#f2a81d";

type ExAgoraMarkProps = {
  className?: string;
  /**
   * `compact` drops the amphitheatre. Below roughly 32px its bands collapse into
   * a smudge, and the header renders at 28. `full` is the complete mark.
   */
  variant?: "compact" | "full";
  /** Set when the mark stands alone, e.g. a bare icon link. */
  title?: string;
};

/**
 * ExAgora mark: a stoa above an amphitheatre, sealed with an amber disc.
 *
 * The temple is the agora's public architecture, the amphitheatre the ring of
 * witnesses, the disc the receipt that settles it. Structure is drawn in
 * `currentColor` so the mark inverts with the theme, and the columns are real
 * holes (`evenodd`) rather than background-coloured fills, so it sits correctly
 * on any surface.
 */
export function ExAgoraMark({
  className,
  variant = "compact",
  title,
}: ExAgoraMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      fill="none"
    >
      {title && <title>{title}</title>}

      {variant === "full" ? (
        <>
          {/* Pediment */}
          <path
            d="M6 23 L32 7 L58 23"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinejoin="miter"
          />
          {/* Architrave */}
          <rect x="9" y="23" width="46" height="4" fill="currentColor" />
          {/* Colonnade — one path, columns punched out with evenodd */}
          <path
            fillRule="evenodd"
            fill="currentColor"
            d="M12 27 H52 V41 H12 Z M17 27 H21.5 V41 H17 Z M25.5 27 H30 V41 H25.5 Z M34 27 H38.5 V41 H34 Z M42.5 27 H47 V41 H42.5 Z"
          />
          {/* Stylobate */}
          <rect x="7" y="41" width="50" height="4.5" fill="currentColor" />
          {/* Amphitheatre, split left and right so the seal sits in a real gap
              rather than relying on a background-coloured halo. */}
          <path
            d="M6 45 Q6 60 24 60.5"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M58 45 Q58 60 40 60.5"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M15 45 Q15 55 26 55.5"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M49 45 Q49 55 38 55.5"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Proof seal */}
          <circle
            cx="32"
            cy="52"
            r="6.5"
            fill={SEAL}
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <path
            d="M7 25 L32 8 L57 25"
            stroke="currentColor"
            strokeWidth="6.5"
            strokeLinejoin="miter"
          />
          <rect x="10" y="25" width="44" height="5" fill="currentColor" />
          <path
            fillRule="evenodd"
            fill="currentColor"
            d="M13 30 H51 V46 H13 Z M18 30 H24 V46 H18 Z M29 30 H35 V46 H29 Z M40 30 H46 V46 H40 Z"
          />
          <rect x="8" y="46" width="48" height="5" fill="currentColor" />
          <circle
            cx="32"
            cy="57"
            r="5.5"
            fill={SEAL}
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </>
      )}
    </svg>
  );
}
