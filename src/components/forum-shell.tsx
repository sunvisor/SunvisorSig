import type { Route } from "next";
import Link from "next/link";

type ForumShellProps = Readonly<{
  title: string;
  eyebrow: string;
  description?: string;
  breadcrumbs?: Array<{
    href?: Route;
    label: string;
  }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

export function ForumShell({
  title,
  eyebrow,
  description,
  breadcrumbs = [],
  actions,
  children,
}: ForumShellProps) {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-4xl border border-slate-300/80 bg-white/85 p-8 shadow-xl shadow-slate-900/5 backdrop-blur">
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
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-700">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                  {description}
                </p>
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
