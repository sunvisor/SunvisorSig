"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormActionState } from "@/lib/action-state";
import { webhookEventOptions, webhookTypeOptions } from "@/lib/webhook-endpoints";
import { ui } from "@/lib/ui-classes";

function WebhookCreateSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${ui.button.primary} ${ui.button.disabled}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "Webhook を作成中..." : "Webhook を追加"}
    </button>
  );
}

type WebhookCreateFormProps = Readonly<{
  forumId: string;
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function WebhookCreateForm({ forumId, action, initialState }: WebhookCreateFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="forumId" type="hidden" value={forumId} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="webhook-name">
          表示名
        </label>
        <input
          className={ui.form.input}
          id="webhook-name"
          name="name"
          placeholder="Slack 開発通知"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="webhook-type">
          連携先
        </label>
        <select className={ui.form.select} defaultValue="SLACK" id="webhook-type" name="type">
          {webhookTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="webhook-url">
          Webhook URL
        </label>
        <input
          className={ui.form.input}
          id="webhook-url"
          name="webhookUrl"
          placeholder="https://..."
          required
          type="url"
        />
      </div>
      <div className={ui.form.group}>
        <p className={ui.text.label}>通知イベント</p>
        <div className="grid gap-3">
          {webhookEventOptions.map((option) => (
            <label key={option.value} className={`${ui.surface.mutedCard} flex items-start gap-3 p-4`}>
              <input defaultChecked type="checkbox" name="events" value={option.value} />
              <span className="grid gap-1">
                <span className="theme-text text-sm font-medium">{option.label}</span>
                <span className={ui.text.body}>{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <WebhookCreateSubmitButton />
      </div>
    </form>
  );
}
