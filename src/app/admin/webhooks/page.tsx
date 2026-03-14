import type { Route } from "next";
import { redirect } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { WebhookCreateForm } from "@/components/webhook-create-form";
import { WebhookEndpointRow } from "@/components/webhook-endpoint-row";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-time";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  getWebhookEndpoints,
  initialWebhookActionState,
  testWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/lib/webhook-settings";
import { ui } from "@/lib/ui-classes";

export default async function AdminWebhooksPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login" as Route);
  }

  if (!isSystemAdmin(currentUser)) {
    redirect("/forums" as Route);
  }

  const endpoints = await getWebhookEndpoints();

  return (
    <ForumShell
      eyebrow="Admin"
      title="Webhook 連携"
      description="Slack、Discord、Microsoft Teams、Google Chat への通知送信先を管理します。"
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { label: "Webhook 連携" },
      ]}
      actions={<PrimaryLink href={"/forums" as Route}>フォーラム一覧へ戻る</PrimaryLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Webhook 追加">
          <WebhookCreateForm
            action={createWebhookEndpointAction}
            initialState={initialWebhookActionState}
          />
        </SectionCard>
        <SectionCard title="対応サービス">
          <div className="grid gap-3">
            <p className={ui.text.body}>対応先は Slack、Discord、Microsoft Teams、Google Chat です。</p>
            <p className={ui.text.body}>
              Teams は Workflows の incoming webhook、他は通常の incoming webhook URL を想定しています。
            </p>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Webhook 一覧">
        {endpoints.length === 0 ? (
          <p className={ui.text.body}>Webhook 設定はまだありません。</p>
        ) : (
          <div className="grid gap-4">
            {endpoints.map((endpoint) => (
              <WebhookEndpointRow
                key={endpoint.id}
                deleteAction={deleteWebhookEndpointAction}
                endpoint={{
                  id: endpoint.id,
                  name: endpoint.name,
                  type: endpoint.type,
                  enabled: endpoint.enabled,
                  events: endpoint.events,
                  webhookUrl: endpoint.webhookUrl,
                  createdAtLabel: formatDateTime(endpoint.createdAt),
                  createdByLabel:
                    endpoint.createdByUser.email
                      ? `${endpoint.createdByUser.displayName} (${endpoint.createdByUser.email})`
                      : endpoint.createdByUser.displayName,
                }}
                initialState={initialWebhookActionState}
                testAction={testWebhookEndpointAction}
                toggleAction={toggleWebhookEndpointAction}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </ForumShell>
  );
}

