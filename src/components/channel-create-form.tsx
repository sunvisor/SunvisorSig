"use client";

import type { Route } from "next";
import { useActionState } from "react";
import { PrimaryLink } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type ChannelCreateFormProps = Readonly<{
  forumId: string;
  forumHref: Route;
  currentUserName: string;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ChannelCreateForm({
  forumId,
  forumHref,
  currentUserName,
  action,
  initialState,
}: ChannelCreateFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="forumId" type="hidden" value={forumId} />
      <p className={ui.text.body}>作成者: {currentUserName}</p>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="name">
          チャンネル名
        </label>
        <input
          className={ui.form.input}
          id="name"
          name="name"
          placeholder="例: 導入準備"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="description">
          説明
        </label>
        <textarea
          className={`${ui.form.textarea} min-h-36`}
          id="description"
          name="description"
          placeholder="このチャンネルで扱う内容を入力してください。"
        />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <SubmitButton>チャンネルを作成</SubmitButton>
        <PrimaryLink href={forumHref}>キャンセル</PrimaryLink>
      </div>
    </form>
  );
}
