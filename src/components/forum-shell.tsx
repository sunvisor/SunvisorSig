import type { Route } from "next";
import Link from "next/link";
import { ui } from "@/lib/ui-classes";

type ForumShellProps = Readonly<{
  title: string;
  eyebrow: string;
  description?: string;
  breadcrumbs?: Array<{
    href?: Route;
    label: string;
  }>;
  actions?: React.ReactNode;
  themeStyle?: React.CSSProperties;
  children: React.ReactNode;
}>;

export function ForumShell({
  title,
  eyebrow,
  description,
  breadcrumbs = [],
  actions,
  themeStyle,
  children,
}: ForumShellProps) {
  return (
    <main className={ui.page.shell} style={themeStyle}>
      <div className={ui.page.container}>
        <header className={ui.surface.hero}>
          {breadcrumbs.length > 0 ? (
            <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {item.href ? (
                    <Link className="transition hover:text-slate-900" href={item.href}>
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-900">{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </span>
              ))}
            </nav>
          ) : null}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={ui.text.eyebrow}>{eyebrow}</p>
              <h1 className={ui.text.title}>{title}</h1>
              {description ? (
                <p className={ui.text.description}>{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
