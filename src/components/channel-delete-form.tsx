"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type ChannelDeleteFormProps = Readonly<{
  forumId: string;
  channelId: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ChannelDeleteForm({
  forumId,
  channelId,
  action,
  initialState,
}: ChannelDeleteFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="forumId" type="hidden" value={forumId} />
      <input name="channelId" type="hidden" value={channelId} />
      <ConfirmSubmitButton
        className={ui.button.danger}
        description="配下の投稿、コメント、添付ファイルは削除待ちデータへ退避された後に削除されます。"
        message="このチャンネルを削除しますか？"
      >
        チャンネル削除
      </ConfirmSubmitButton>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
