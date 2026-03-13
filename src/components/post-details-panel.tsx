"use client";

import { useCallback, useEffect, useState } from "react";
import { AttachmentLink } from "@/components/attachment-link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MetadataRow, SectionCard } from "@/components/forum-ui";
import { PostInlineEditor } from "@/components/post-inline-editor";
import { PostStatusBadge } from "@/components/post-status-badge";
import { PostStatusForm } from "@/components/post-status-form";
import type { FormActionState } from "@/lib/action-state";
import type { PostDetailsItem } from "@/lib/activity-presenter";
import { ui } from "@/lib/ui-classes";

type SharedPostDetailsProps = Readonly<{
  post: PostDetailsItem;
  forumId: string;
  channelId: string;
  currentUserId: string;
  isAdmin: boolean;
  deletePostAction: (formData: FormData) => Promise<void>;
  deleteAttachmentAction: (formData: FormData) => Promise<void>;
}>;

type PostBodyPanelProps = SharedPostDetailsProps &
  Readonly<{
    updatePostAction: (
      state: FormActionState,
      formData: FormData,
    ) => Promise<FormActionState>;
    updatePostInitialState: FormActionState;
  }>;

type PostInfoPanelProps = SharedPostDetailsProps &
  Readonly<{
    updateStatusAction: (
      state: FormActionState,
      formData: FormData,
    ) => Promise<FormActionState>;
    updateStatusInitialState: FormActionState;
  }>;

function useLivePost(postId: string, initialPost: PostDetailsItem) {
  const [item, setItem] = useState(initialPost);

  useEffect(() => {
    setItem(initialPost);
  }, [initialPost]);

  const refreshPost = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { post: PostDetailsItem };
    setItem(data.post);
  }, [postId]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/posts/${postId}/stream`);
    const handleRefresh = () => {
      if (document.querySelector("[data-post-editor-state='editing']")) {
        return;
      }

      void refreshPost();
    };
    const handleForcedRefresh = () => {
      void refreshPost();
    };

    eventSource.addEventListener("refresh", handleRefresh);
    window.addEventListener(`post-details:refresh:${postId}`, handleForcedRefresh);

    return () => {
      eventSource.removeEventListener("refresh", handleRefresh);
      window.removeEventListener(`post-details:refresh:${postId}`, handleForcedRefresh);
      eventSource.close();
    };
  }, [postId, refreshPost]);

  return item;
}

export function PostBodyPanel({
  post,
  forumId,
  channelId,
  currentUserId,
  isAdmin,
  updatePostAction,
  updatePostInitialState,
  deletePostAction,
  deleteAttachmentAction,
}: PostBodyPanelProps) {
  const item = useLivePost(post.id, post);
  const editable = item.authorUserId === currentUserId;

  return (
    <SectionCard title="本文">
      <PostInlineEditor
        action={updatePostAction}
        attachments={item.attachments}
        bodyMarkdown={item.bodyMarkdown}
        channelId={channelId}
        deleteAttachmentAction={deleteAttachmentAction}
        editable={editable}
        forumId={forumId}
        initialState={updatePostInitialState}
        postId={item.id}
        title={item.title}
        trailingActions={
          editable || isAdmin ? (
            <form action={deletePostAction}>
              <input name="forumId" type="hidden" value={forumId} />
              <input name="channelId" type="hidden" value={channelId} />
              <input name="postId" type="hidden" value={item.id} />
              <ConfirmSubmitButton
                ariaLabel="投稿を削除"
                className={ui.button.iconDanger}
                description="投稿本体、投稿添付、配下コメント、コメント添付が削除待ちデータへ退避された後に削除されます。"
                icon="trash"
                message="この投稿を削除しますか？"
              />
            </form>
          ) : null
        }
      />
    </SectionCard>
  );
}

export function PostInfoPanel({
  post,
  forumId,
  channelId,
  currentUserId,
  deleteAttachmentAction,
  updateStatusAction,
  updateStatusInitialState,
}: PostInfoPanelProps) {
  const item = useLivePost(post.id, post);
  const editable = item.authorUserId === currentUserId;

  return (
    <SectionCard title="投稿情報">
      <dl className="grid gap-3">
        <MetadataRow label="投稿者" value={item.authorDisplayName} />
        {item.status ? (
          <MetadataRow label="状態" value={<PostStatusBadge status={item.status} />} />
        ) : null}
        <MetadataRow label="添付数" value={item.attachmentCount} />
        <MetadataRow label="コメント数" value={item.commentCount} />
        <MetadataRow label="作成日時" value={item.createdAtLabel} />
        <MetadataRow label="更新日時" value={item.updatedAtLabel} />
      </dl>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-950">添付ファイル</h3>
        <div className="mt-3 grid gap-3">
          {item.attachments.map((attachment) => (
            <AttachmentLink
              compact
              key={attachment.id}
              deleteAction={editable ? deleteAttachmentAction : undefined}
              deleteAriaLabel="投稿添付を削除"
              deleteDescription="削除した添付ファイルを本文で参照している場合、その参照は Missing 表示になります。"
              deleteFields={
                editable
                  ? {
                      forumId,
                      channelId,
                      postId: item.id,
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
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-950">状態を変更</h3>
        <p className="mt-1 text-sm text-slate-600">
          フォーラム参加者であれば、だれでも状態を更新できます。
        </p>
        <div className="mt-3">
          <PostStatusForm
            action={updateStatusAction}
            channelId={channelId}
            currentStatus={item.status}
            forumId={forumId}
            initialState={updateStatusInitialState}
            postId={item.id}
          />
        </div>
      </div>
    </SectionCard>
  );
}
