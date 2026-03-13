import type { Route } from "next";
import { redirect } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit-log";
import { formatDateTime } from "@/lib/date-time";
import { ui } from "@/lib/ui-classes";

export default async function AuditLogsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isSystemAdmin(currentUser)) {
    redirect("/forums");
  }

  const logs = await getAuditLogs();

  return (
    <ForumShell
      eyebrow="Admin"
      title="監査ログ"
      description="管理操作の履歴を新しい順に確認できます。"
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { label: "監査ログ" },
      ]}
      actions={<PrimaryLink href={"/forums" as Route}>フォーラム一覧へ戻る</PrimaryLink>}
    >
      <SectionCard title="操作履歴">
        <div className="grid gap-4">
          {logs.map((log) => (
            <div key={log.id} className={`${ui.surface.mutedCard} grid gap-3 p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="theme-text text-base font-medium">{log.targetLabel}</p>
                  <p className={ui.text.body}>
                    {log.actorUser.displayName}
                    {log.actorUser.email ? ` (${log.actorUser.email})` : ""} が
                    {" "}
                    {log.actionType}
                  </p>
                </div>
                <p className={ui.text.subtleMeta}>{formatDateTime(log.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className={ui.text.meta}>Target {log.targetType}</span>
                <span className={ui.text.meta}>ID {log.targetId}</span>
              </div>
              {log.metadata ? (
                <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </ForumShell>
  );
}
