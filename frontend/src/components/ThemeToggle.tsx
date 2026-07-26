"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Ikon dipilih lewat CSS variant `dark:`, bukan lewat state `mounted`.
 * Tema hanya diketahui di klien, jadi merendernya dari state akan
 * memicu hydration mismatch — atau memaksa pola setState-in-effect.
 * Kelas `dark` sudah dipasang next-themes sebelum paint, jadi CSS
 * selalu benar sejak frame pertama.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle colour theme"
      className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-[var(--accent)] hover:text-foreground"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </button>
  );
}
