"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AppErrorCode } from "@/lib/app-error";
import { ui } from "@/lib/ui-classes";

type InvitationActionState = {
  ok: boolean;
  code?: AppErrorCode;
  message: string;
};

function InvitationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${ui.button.primary} ${ui.button.disabled}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "招待を作成中..." : "招待を作成"}
    </button>
  );
}

type InvitationCreateFormProps = Readonly<{
  forumId: string;
  action: (
    state: InvitationActionState,
    formData: FormData,
  ) => Promise<InvitationActionState>;
  initialState: InvitationActionState;
}>;

export function InvitationCreateForm({
  forumId,
  action,
  initialState,
}: InvitationCreateFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const hint =
    state.code === "USER_ALREADY_EXISTS"
      ? "既存アカウントは下の参加者管理から追加してください。"
      : state.code === "INVITATION_ALREADY_EXISTS"
        ? "招待一覧に既存の招待が表示されています。"
        : null;

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="forumId" type="hidden" value={forumId} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="invite-email">
          メールアドレス
        </label>
        <input
          className={ui.form.input}
          id="invite-email"
          name="email"
          placeholder="new-user@example.com"
          required
          type="email"
        />
      </div>
      <p className={ui.text.body}>
        招待で追加されるユーザーは、アクティベーション後にこのフォーラムの参加者になります。
      </p>
      {state.message ? (
        <div className="grid gap-1">
          <p
            className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}
          >
            {state.message}
          </p>
          {hint ? <p className="text-sm font-medium text-amber-700">{hint}</p> : null}
        </div>
      ) : null}
      <div className={ui.form.actions}>
        <InvitationSubmitButton />
      </div>
    </form>
  );
}
