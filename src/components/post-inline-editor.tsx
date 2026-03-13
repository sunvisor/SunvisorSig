"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type AttachmentRef = {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
};

type PostInlineEditorProps = Readonly<{
  forumId: string;
  channelId: string;
  postId: string;
  title: string;
  bodyMarkdown: string;
  attachments: AttachmentRef[];
  editable: boolean;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
  trailingActions?: React.ReactNode;
}>;

export function PostInlineEditor({
  forumId,
  channelId,
  postId,
  title,
  bodyMarkdown,
  attachments,
  editable,
  action,
  initialState,
  trailingActions,
}: PostInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState(action, initialState);

  if (!editable || !isEditing) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={ui.text.meta}>タイトル</p>
            <h3 className="theme-text mt-2 text-2xl font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {editable ? (
              <button
                aria-label="投稿を編集"
                className={ui.button.iconSecondary}
                onClick={() => setIsEditing(true)}
                type="button"
              >
                <Pencil aria-hidden="true" size={16} />
              </button>
            ) : null}
            {trailingActions}
          </div>
        </div>
        <MarkdownContent attachments={attachments} value={bodyMarkdown} />
      </div>
    );
  }

  return (
    <form action={formAction} className={ui.form.layout}>
      <input name="forumId" type="hidden" value={forumId} />
      <input name="channelId" type="hidden" value={channelId} />
      <input name="postId" type="hidden" value={postId} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor={`post-title-${postId}`}>
          タイトル
        </label>
        <input
          className={ui.form.input}
          defaultValue={title}
          id={`post-title-${postId}`}
          name="title"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor={`post-body-${postId}`}>
          本文
        </label>
        <textarea
          className={`${ui.form.textarea} min-h-56`}
          defaultValue={bodyMarkdown}
          id={`post-body-${postId}`}
          name="bodyMarkdown"
          required
        />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-700"}>
          {state.message}
        </p>
      ) : null}
      <div className={ui.form.actions}>
        <button className={ui.button.primary} type="submit">
          投稿を保存
        </button>
        <button
          className={ui.button.secondary}
          onClick={() => setIsEditing(false)}
          type="button"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
