import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Dipertahankan agar pemanggil lama tidak error. Sistem warna per-halaman
 * sudah dihapus — seluruh aplikasi kini memakai satu aksen.
 * @deprecated Prop `accent` tidak lagi berpengaruh.
 */
export type PageAccent = "cyan" | "azure" | "indigo" | "gold" | "teal";

type Crumb = { label: string; href?: string };
type Stat = { label: string; value: ReactNode };

type PageHeaderProps = {
  /** Label mono kecil di atas judul. */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** @deprecated Diabaikan. Satu aksen untuk seluruh aplikasi. */
  accent?: PageAccent;
  breadcrumb?: Crumb[];
  stats?: Stat[];
};

/**
 * Header halaman dengan bahasa yang sama seperti homepage: eyebrow mono,
 * judul weight 300, hairline pemisah. Angka ditampilkan sebagai deret
 * kolom — bukan chip pil — supaya sebentuk dengan rail di hero.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  breadcrumb,
  stats,
}: PageHeaderProps) {
  return (
    <div className="pb-10">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav className="mb-5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
              {breadcrumb.map((crumb) => (
                <span key={crumb.label} className="flex items-center gap-1.5">
                  <span className="text-border">/</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground/80">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>
          )}

          <h1 className="display-lg">{title}</h1>

          {description && (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-x-14 gap-y-6 border-t border-border pt-7">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="eyebrow">{stat.label}</p>
              <p className="mt-1.5 font-mono text-2xl font-light tabular-nums text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
