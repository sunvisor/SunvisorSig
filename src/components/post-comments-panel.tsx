"use client";

import { useCallback, useEffect, useState } from "react";
import { AttachmentLink } from "@/components/attachment-link";
import { CommentInlineEditor } from "@/components/comment-inline-editor";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/forum-ui";
import type { FormActionState } from "@/lib/action-state";
import type { CommentListItem } from "@/lib/activity-presenter";
import { ui } from "@/lib/ui-classes";

type PostCommentsPanelProps = Readonly<{
  comments: CommentListItem[];
  forumId: string;
  channelId: string;
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
  updateCommentAction: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  updateCommentInitialState: FormActionState;
  deleteCommentAction: (formData: FormData) => Promise<void>;
  deleteCommentAttachmentAction: (formData: FormData) => Promise<void>;
}>;

export function PostCommentsPanel({
  comments,
  forumId,
  channelId,
  postId,
  currentUserId,
  isAdmin,
  updateCommentAction,
  updateCommentInitialState,
  deleteCommentAction,
  deleteCommentAttachmentAction,
}: PostCommentsPanelProps) {
  const [items, setItems] = useState(comments);

  useEffect(() => {
    setItems(comments);
  }, [comments]);

  const refreshComments = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { comments: CommentListItem[] };
    setItems(data.comments);
  }, [postId]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/posts/${postId}/stream`);
    const handleRefresh = () => {
      if (document.querySelector("[data-comment-editor-state='editing']")) {
        return;
      }

      void refreshComments();
    };
    const handleForcedRefresh = () => {
      void refreshComments();
    };

    eventSource.addEventListener("refresh", handleRefresh);
    window.addEventListener(`post-comments:refresh:${postId}`, handleForcedRefresh);

    return () => {
      eventSource.removeEventListener("refresh", handleRefresh);
      window.removeEventListener(`post-comments:refresh:${postId}`, handleForcedRefresh);
      eventSource.close();
    };
  }, [postId, refreshComments]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="コメントがありません"
        description="この投稿にはまだコメントが付いていません。"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((comment) =>
        comment.type === "STATUS_CHANGE" ? (
          <article key={comment.id} className="py-1 text-center">
            <p className="text-sm text-slate-500">{comment.bodyMarkdown}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              {comment.createdAtLabel}
            </p>
          </article>
        ) : (
          <article
            key={comment.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-950">{comment.authorDisplayName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {comment.createdAtLabel}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Files {comment.attachments.length}
              </p>
            </div>
            <div className="mt-4">
              <CommentInlineEditor
                action={updateCommentAction}
                attachments={comment.attachments}
                bodyMarkdown={comment.bodyMarkdown}
                channelId={channelId}
                commentId={comment.id}
                editable={comment.authorUserId === currentUserId}
                forumId={forumId}
                initialState={updateCommentInitialState}
                postId={postId}
                deleteAttachmentAction={deleteCommentAttachmentAction}
                trailingActions={
                  comment.authorUserId === currentUserId || isAdmin ? (
                    <form action={deleteCommentAction}>
                      <input name="forumId" type="hidden" value={forumId} />
                      <input name="channelId" type="hidden" value={channelId} />
                      <input name="postId" type="hidden" value={postId} />
                      <input name="commentId" type="hidden" value={comment.id} />
                      <ConfirmSubmitButton
                        ariaLabel="コメントを削除"
                        className={ui.button.iconDanger}
                        description="添付ファイルがある場合は、その情報も削除待ちデータへ退避されます。"
                        icon="trash"
                        message="このコメントを削除しますか？"
                      />
                    </form>
                  ) : null
                }
              />
            </div>
            {comment.attachments.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {comment.attachments.map((attachment) => (
                  <AttachmentLink
                    compact
                    key={attachment.id}
                    deleteAction={
                      comment.authorUserId === currentUserId
                        ? deleteCommentAttachmentAction
                        : undefined
                    }
                    deleteAriaLabel="コメント添付を削除"
                    deleteDescription="削除した添付ファイルを本文で参照している場合、その参照は Missing 表示になります。"
                    deleteFields={
                      comment.authorUserId === currentUserId
                        ? {
                            forumId,
                            channelId,
                            postId,
                            commentId: comment.id,
                            attachmentId: attachment.id,
                          }
                        : undefined
                    }
                    deleteMessage="この添付ファイルを削除しますか？"
                    filename={attachment.originalFilename}
                    mimeType={attachment.mimeType}
                    sizeBytes={attachment.sizeBytes}
                    storagePath={attachment.storagePath}
                  />
                ))}
              </div>
            ) : null}
          </article>
        ),
      )}
    </div>
  );
}
