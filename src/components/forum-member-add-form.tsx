"use client";

import { useActionState } from "react";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type CandidateUser = {
  id: string;
  displayName: string;
  email: string | null;
};

type ForumMemberAddFormProps = Readonly<{
  forumId: string;
  candidateUsers: CandidateUser[];
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ForumMemberAddForm({
  forumId,
  candidateUsers,
  action,
  initialState,
}: ForumMemberAddFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="forumId" type="hidden" value={forumId} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="userId">
          ユーザー
        </label>
        <select className={ui.form.select} id="userId" name="userId" required>
          {candidateUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
              {user.email ? ` (${user.email})` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className={ui.text.body}>追加されたユーザーはこのフォーラムの参加者になります。</p>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <button className={ui.button.primary} type="submit">
          参加者を追加
        </button>
      </div>
    </form>
  );
}
