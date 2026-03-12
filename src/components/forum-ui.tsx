import type { Route } from "next";
import Link from "next/link";

export function SectionCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[1.75rem] border border-slate-300/80 bg-white/85 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
}: Readonly<{ href: Route; children: React.ReactNode }>) {
  return (
    <Link
      className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium !text-white transition hover:bg-slate-800"
      href={href}
    >
      {children}
    </Link>
  );
}

export function MetadataRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export function MarkdownBlock({
  value,
}: Readonly<{ value: string }>) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 whitespace-pre-wrap text-slate-800">
      {value}
    </pre>
  );
}
