import type { Route } from "next";
import Link from "next/link";
import { ui } from "@/lib/ui-classes";

export function SectionCard({
  title,
  style,
  children,
}: Readonly<{
  title: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}>) {
  return (
    <section className={ui.surface.card} style={style}>
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
      <p className="theme-text font-medium">{title}</p>
      <p className="theme-text-muted mt-2 text-sm leading-6">
        {description}
      </p>
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
    <div className="theme-muted-card flex flex-col gap-1 rounded-2xl border p-4">
      <dt className={ui.text.meta}>{label}</dt>
      <dd className={ui.text.value}>{value}</dd>
    </div>
  );
}

export function MarkdownBlock({
  value,
}: Readonly<{ value: string }>) {
  return (
    <pre className="theme-muted-card theme-text overflow-x-auto rounded-2xl border p-4 text-sm leading-7 whitespace-pre-wrap">
      {value}
    </pre>
  );
}
