"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type ForumDeleteFormProps = Readonly<{
  forumId: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ForumDeleteForm({
  forumId,
  action,
  initialState,
}: ForumDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="forumId" type="hidden" value={forumId} />
      <ConfirmSubmitButton
        className={ui.button.danger}
        description="配下のチャンネル、投稿、コメント、添付ファイル、参加者関連付け、招待がまとめて物理削除されます。"
        message="このフォーラムを削除しますか？"
      >
        フォーラム削除
      </ConfirmSubmitButton>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
