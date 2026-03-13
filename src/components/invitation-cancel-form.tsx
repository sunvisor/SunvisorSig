"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type InvitationCancelFormProps = Readonly<{
  forumId: string;
  invitationId: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function InvitationCancelForm({
  forumId,
  invitationId,
  action,
  initialState,
}: InvitationCancelFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid justify-items-end gap-2">
      <input name="forumId" type="hidden" value={forumId} />
      <input name="invitationId" type="hidden" value={invitationId} />
      <ConfirmSubmitButton
        ariaLabel="招待を取り消す"
        className={ui.button.iconDanger}
        description="取り消した招待リンクは無効になります。"
        icon="trash"
        message="この招待を取り消しますか？"
      />
      {state.message ? (
        <p className={state.ok ? "text-right text-sm font-medium text-emerald-700" : "text-right text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
