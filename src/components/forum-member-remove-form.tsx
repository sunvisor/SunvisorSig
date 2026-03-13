"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type ForumMemberRemoveFormProps = Readonly<{
  forumId: string;
  userId: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ForumMemberRemoveForm({
  forumId,
  userId,
  action,
  initialState,
}: ForumMemberRemoveFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid justify-items-end gap-2">
      <input name="forumId" type="hidden" value={forumId} />
      <input name="userId" type="hidden" value={userId} />
      <ConfirmSubmitButton
        ariaLabel="参加者をフォーラムから外す"
        className={ui.button.iconDanger}
        description="この参加者はフォーラム一覧とチャンネル一覧へアクセスできなくなります。"
        icon="trash"
        message="この参加者をフォーラムから外しますか？"
      />
      {state.message ? (
        <p className={state.ok ? "text-right text-sm font-medium text-emerald-700" : "text-right text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
