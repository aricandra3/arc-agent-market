import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/exagora/Reveal";

type Step = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Analogous accents — the journey shifts cyan → teal → azure → indigo. */
const accents = [
  "var(--accent-cyan)",
  "var(--accent-teal)",
  "var(--accent-azure)",
  "var(--accent-indigo)",
];

/**
 * Connected, flowing process stepper. Each step carries the next hue in an
 * analogous progression, so the rail reads as one harmonious journey rather
 * than four identical, single-colour boxes.
 */
export function LifecycleFlow({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      <span
        aria-hidden="true"
        className="absolute top-6 left-0 hidden h-px w-full bg-[linear-gradient(to_right,var(--accent-cyan),var(--accent-teal),var(--accent-azure),var(--accent-indigo))] opacity-40 lg:block"
      />
      {steps.map(({ number, title, description, icon: Icon }, index) => (
        <Reveal key={number} delay={index * 110}>
          <li
            className="group/step relative"
            style={{ ["--accent" as string]: accents[index % accents.length] }}
          >
            <div className="flex items-center gap-4 lg:block">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-full border bg-[#0b1f33] font-mono text-sm font-semibold tabular-nums shadow-[0_0_0_6px_#071426] transition-all duration-300 [border-color:color-mix(in_srgb,var(--accent)_35%,transparent)] [color:color-mix(in_srgb,var(--accent)_62%,#e6f1ef)] group-hover/step:[border-color:var(--accent)] group-hover/step:[box-shadow:0_0_0_6px_#071426,0_0_22px_-2px_var(--accent)]">
                {number}
                {index === 0 && (
                  <span className="absolute inset-0 animate-ping rounded-full border [border-color:color-mix(in_srgb,var(--accent)_55%,transparent)]" />
                )}
              </span>
              <Icon
                className="size-5 text-[#5f82a6] transition-colors duration-300 group-hover/step:[color:var(--accent)] lg:mt-6"
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}
