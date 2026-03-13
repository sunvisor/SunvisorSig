"use client";

import { useActionState } from "react";
import type { FormActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/lib/ui-classes";

type ActivationFormProps = Readonly<{
  token: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ActivationForm({
  token,
  action,
  initialState,
}: ActivationFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="token" type="hidden" value={token} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="displayName">
          表示名
        </label>
        <input
          className={ui.form.input}
          id="displayName"
          name="displayName"
          placeholder="例: Acme Customer"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="password">
          パスワード
        </label>
        <input
          className={ui.form.input}
          id="password"
          minLength={8}
          name="password"
          placeholder="8文字以上"
          required
          type="password"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="passwordConfirmation">
          パスワード確認
        </label>
        <input
          className={ui.form.input}
          id="passwordConfirmation"
          minLength={8}
          name="passwordConfirmation"
          placeholder="もう一度入力"
          required
          type="password"
        />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <SubmitButton>アカウントを有効化</SubmitButton>
      </div>
    </form>
  );
}
