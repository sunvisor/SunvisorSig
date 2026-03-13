"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LoginActionState } from "@/lib/auth";
import { ui } from "@/lib/ui-classes";

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${ui.button.primary} ${ui.button.disabled}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "ログイン中..." : "ログイン"}
    </button>
  );
}

type LoginFormProps = Readonly<{
  action: (
    state: LoginActionState,
    formData: FormData,
  ) => Promise<LoginActionState>;
  initialState: LoginActionState;
}>;

export function LoginForm({ action, initialState }: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="email">
          メールアドレス
        </label>
        <input
          className={ui.form.input}
          id="email"
          name="email"
          placeholder="user@example.com"
          required
          type="email"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="password">
          パスワード
        </label>
        <input
          className={ui.form.input}
          id="password"
          name="password"
          placeholder="パスワード"
          required
          type="password"
        />
      </div>
      {state.message ? (
        <p className="text-sm font-medium text-rose-700">{state.message}</p>
      ) : null}
      <div className={ui.form.actions}>
        <LoginSubmitButton />
      </div>
    </form>
  );
}
