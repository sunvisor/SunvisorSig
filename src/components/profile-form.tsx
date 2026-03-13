"use client";

import { useActionState } from "react";
import type { FormActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/lib/ui-classes";

type ProfileFormProps = Readonly<{
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
  initialValues: {
    displayName: string;
    email: string | null;
    mentionHandle: string | null;
  };
}>;

export function ProfileForm({
  action,
  initialState,
  initialValues,
}: ProfileFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="email">
          メールアドレス
        </label>
        <input
          className={ui.form.input}
          defaultValue={initialValues.email ?? ""}
          disabled
          id="email"
          type="email"
        />
        <p className={ui.text.body}>ログインに使うメールアドレスです。今回は変更できません。</p>
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="displayName">
          表示名
        </label>
        <input
          className={ui.form.input}
          defaultValue={initialValues.displayName}
          id="displayName"
          name="displayName"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="mentionHandle">
          メンション用ハンドル
        </label>
        <div className="relative">
          <span className="theme-text-muted pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-sm">
            @
          </span>
          <input
            className={`${ui.form.input} pl-8`}
            defaultValue={initialValues.mentionHandle ?? ""}
            id="mentionHandle"
            name="mentionHandle"
            placeholder="hisashi"
            type="text"
          />
        </div>
        <p className={ui.text.body}>
          英小文字、数字、ハイフン、アンダースコアが使えます。空欄にするとメンション不可になります。
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className={ui.form.group}>
          <label className={ui.text.label} htmlFor="nextPassword">
            新しいパスワード
          </label>
          <input
            className={ui.form.input}
            id="nextPassword"
            name="nextPassword"
            placeholder="変更しない場合は空欄"
            type="password"
          />
        </div>
        <div className={ui.form.group}>
          <label className={ui.text.label} htmlFor="nextPasswordConfirmation">
            新しいパスワード確認
          </label>
          <input
            className={ui.form.input}
            id="nextPasswordConfirmation"
            name="nextPasswordConfirmation"
            placeholder="変更しない場合は空欄"
            type="password"
          />
        </div>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? "text-sm font-medium text-emerald-700"
              : "text-sm font-medium text-rose-700"
          }
        >
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <SubmitButton>プロフィールを保存</SubmitButton>
      </div>
    </form>
  );
}
