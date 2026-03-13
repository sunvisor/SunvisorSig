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

type CommentInlineEditorProps = Readonly<{
  forumId: string;
  channelId: string;
  postId: string;
  commentId: string;
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

export function CommentInlineEditor({
  forumId,
  channelId,
  postId,
  commentId,
  bodyMarkdown,
  attachments,
  editable,
  action,
  initialState,
  trailingActions,
}: CommentInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState(action, initialState);

  if (!editable || !isEditing) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start justify-end gap-2">
          {editable ? (
            <button
              aria-label="コメントを編集"
              className={ui.button.iconSecondary}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Pencil aria-hidden="true" size={16} />
            </button>
          ) : null}
          {trailingActions}
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
      <input name="commentId" type="hidden" value={commentId} />
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor={`comment-body-${commentId}`}>
          本文
        </label>
        <textarea
          className={`${ui.form.textarea} min-h-40`}
          defaultValue={bodyMarkdown}
          id={`comment-body-${commentId}`}
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
          コメントを保存
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
