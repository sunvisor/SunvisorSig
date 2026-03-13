"use client";

import { useActionState } from "react";
import type { FormActionState } from "@/lib/action-state";
import { postStatusOptions } from "@/lib/post-status";
import { ui } from "@/lib/ui-classes";

type PostStatusFormProps = Readonly<{
  forumId: string;
  channelId: string;
  postId: string;
  currentStatus: string | null;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function PostStatusForm({
  forumId,
  channelId,
  postId,
  currentStatus,
  action,
  initialState,
}: PostStatusFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="forumId" type="hidden" value={forumId} />
      <input name="channelId" type="hidden" value={channelId} />
      <input name="postId" type="hidden" value={postId} />
      <select
        className={ui.form.select}
        defaultValue={currentStatus ?? ""}
        name="status"
      >
        {postStatusOptions.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {state.message ? (
        <p className="text-sm font-medium text-rose-700">{state.message}</p>
      ) : null}
      <button className={ui.button.primary} type="submit">
        状態を更新
      </button>
    </form>
  );
}
