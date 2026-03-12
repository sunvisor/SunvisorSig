import type { Route } from "next";
import Link from "next/link";
import { ui } from "@/lib/ui-classes";

export function SectionCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className={ui.surface.card}>
      <h2 className={ui.text.sectionTitle}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className={ui.surface.empty}>
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
      className={ui.button.primaryLink}
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
      <dt className={ui.text.meta}>{label}</dt>
      <dd className={ui.text.value}>{value}</dd>
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
