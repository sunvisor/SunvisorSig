"use client";

import { useActionState, useEffect, useState } from "react";
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
  deleteAttachmentAction?: (formData: FormData) => Promise<void>;
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
  deleteAttachmentAction,
  initialState,
  trailingActions,
}: CommentInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      const timer = window.setTimeout(() => {
        setIsEditing(false);
        window.dispatchEvent(new Event(`post-comments:refresh:${postId}`));
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [postId, state.ok]);

  if (!editable || !isEditing) {
    return (
      <div className="grid gap-4" data-comment-editor-state="idle">
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
        <MarkdownContent
          attachmentDeleteConfig={
            editable && deleteAttachmentAction
              ? {
                  action: deleteAttachmentAction,
                  ariaLabel: "コメント添付を削除",
                  message: "この添付ファイルを削除しますか？",
                  description:
                    "削除した添付ファイルを本文で参照している場合、その参照は Missing 表示になります。",
                  buildFields: (attachment) => ({
                    forumId,
                    channelId,
                    postId,
                    commentId,
                    attachmentId: attachment.id,
                  }),
                }
              : undefined
          }
          attachments={attachments}
          value={bodyMarkdown}
        />
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className={ui.form.layout}
      data-comment-editor-state="editing"
    >
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
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor={`comment-attachments-${commentId}`}>
          添付ファイルを追加
        </label>
        <input
          className={ui.form.fileInput}
          id={`comment-attachments-${commentId}`}
          multiple
          name="attachments"
          type="file"
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
