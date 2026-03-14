"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { FormActionState } from "@/lib/action-state";
import {
  getWebhookEventLabel,
  getWebhookTypeLabel,
  maskWebhookUrl,
} from "@/lib/webhook-endpoints";
import { ui } from "@/lib/ui-classes";

type WebhookEndpointRowProps = Readonly<{
  endpoint: {
    id: string;
    name: string;
    type: "SLACK" | "DISCORD" | "TEAMS" | "GOOGLE_CHAT";
    enabled: boolean;
    events: Array<"POST_CREATED" | "COMMENT_CREATED" | "MENTIONED" | "STATUS_CHANGED">;
    webhookUrl: string;
    createdAtLabel: string;
    createdByLabel: string;
  };
  initialState: FormActionState;
  toggleAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  testAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  deleteAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
}>;

export function WebhookEndpointRow({
  endpoint,
  initialState,
  toggleAction,
  testAction,
  deleteAction,
}: WebhookEndpointRowProps) {
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);
  const [testState, testFormAction] = useActionState(testAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);

  return (
    <div className={`${ui.surface.mutedCard} grid gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="theme-text text-base font-medium">{endpoint.name}</p>
          <div className="flex flex-wrap gap-3">
            <span className={ui.text.meta}>{getWebhookTypeLabel(endpoint.type)}</span>
            <span className={ui.text.meta}>{endpoint.enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <p className="theme-text-muted break-all text-sm leading-6">{maskWebhookUrl(endpoint.webhookUrl)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleFormAction}>
            <input name="endpointId" type="hidden" value={endpoint.id} />
            <button className={ui.button.secondary} type="submit">
              {endpoint.enabled ? "無効化" : "有効化"}
            </button>
          </form>
          <form action={testFormAction}>
            <input name="endpointId" type="hidden" value={endpoint.id} />
            <button className={ui.button.secondary} type="submit">
              テスト送信
            </button>
          </form>
          <form action={deleteFormAction}>
            <input name="endpointId" type="hidden" value={endpoint.id} />
            <ConfirmSubmitButton
              ariaLabel="Webhook 設定を削除"
              className={ui.button.iconDanger}
              description="削除すると、この設定への webhook 配信は停止します。"
              icon="trash"
              message="この Webhook 設定を削除しますか？"
            />
          </form>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {endpoint.events.map((eventType) => (
          <span key={eventType} className="theme-card theme-text inline-flex rounded-full border px-3 py-1 text-xs font-medium">
            {getWebhookEventLabel(eventType)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <span className={ui.text.subtleMeta}>Created {endpoint.createdAtLabel}</span>
        <span className={ui.text.subtleMeta}>By {endpoint.createdByLabel}</span>
      </div>
      {toggleState.message ? (
        <p className={toggleState.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {toggleState.message}
        </p>
      ) : null}
      {testState.message ? (
        <p className={testState.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {testState.message}
        </p>
      ) : null}
      {deleteState.message ? (
        <p className={deleteState.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {deleteState.message}
        </p>
      ) : null}
    </div>
  );
}
