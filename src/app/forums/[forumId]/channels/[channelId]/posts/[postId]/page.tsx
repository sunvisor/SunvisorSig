import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { AttachmentLink } from "@/components/attachment-link";
import { CommentInlineEditor } from "@/components/comment-inline-editor";
import { CommentComposer } from "@/components/comment-composer";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ForumShell } from "@/components/forum-shell";
import {
  EmptyState,
  MetadataRow,
  PrimaryLink,
  SectionCard,
} from "@/components/forum-ui";
import { PostInlineEditor } from "@/components/post-inline-editor";
import { PostStatusBadge } from "@/components/post-status-badge";
import { PostStatusForm } from "@/components/post-status-form";
import { initialCommentEditActionState, updateCommentAction } from "@/lib/comment-editing";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import {
  createCommentAction,
  initialCommentCreateActionState,
} from "@/lib/comment-creation";
import { deleteComment } from "@/lib/comment-deletion";
import { deletePost } from "@/lib/post-deletion";
import { initialPostEditActionState, updatePostAction } from "@/lib/post-editing";
import {
  initialPostStatusActionState,
  updatePostStatusAction,
} from "@/lib/post-status-editing";
import { formatDateTime } from "@/lib/date-time";
import { getPost, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type PostPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string; postId: string }>;
}>;

export default async function PostPage({ params }: PostPageProps) {
  const { forumId, channelId, postId } = await params;
  const [post, currentUser] = await Promise.all([getPost(postId), getCurrentUser()]);

  if (
    !post ||
    post.channelId !== channelId ||
    post.channel.forumId !== forumId
  ) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login");
  }

  if (!isForumMember(post.channel.forum, currentUser.id)) {
    notFound();
  }

  const isAdmin = isSystemAdmin(currentUser);

  return (
    <ForumShell
      eyebrow="Post"
      title={post.title}
      description={`${post.authorUser.displayName} による投稿`}
      themeStyle={getForumPageStyle(post.channel.forum)}
      heroStyle={getForumHeroStyle(post.channel.forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { href: `/forums/${post.channel.forum.id}` as Route, label: post.channel.forum.name },
        {
          href: `/forums/${post.channel.forum.id}/channels/${post.channel.id}` as Route,
          label: post.channel.name,
        },
        { label: post.title },
      ]}
      actions={
        <PrimaryLink href={`/forums/${forumId}/channels/${channelId}` as Route}>
          チャンネルへ戻る
        </PrimaryLink>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <SectionCard title="本文">
            <PostInlineEditor
              action={updatePostAction}
              attachments={post.attachments}
              bodyMarkdown={post.bodyMarkdown}
              channelId={channelId}
              editable={post.authorUserId === currentUser.id}
              forumId={forumId}
              initialState={initialPostEditActionState}
              postId={postId}
              trailingActions={
                post.authorUserId === currentUser.id || isAdmin ? (
                  <form action={deletePost}>
                    <input name="forumId" type="hidden" value={forumId} />
                    <input name="channelId" type="hidden" value={channelId} />
                    <input name="postId" type="hidden" value={postId} />
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
              title={post.title}
            />
          </SectionCard>
          <SectionCard title="コメント">
            {post.comments.length === 0 ? (
              <EmptyState
                title="コメントがありません"
                description="この投稿にはまだコメントが付いていません。"
              />
            ) : (
              <div className="grid gap-4">
                {post.comments.map((comment) => (
                  comment.type === "STATUS_CHANGE" ? (
                    <article key={comment.id} className="py-1 text-center">
                      <p className="text-sm text-slate-500">
                        {comment.bodyMarkdown}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </article>
                  ) : (
                    <article
                      key={comment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-950">
                            {comment.authorUser.displayName}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {formatDateTime(comment.createdAt)}
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
                          editable={comment.authorUserId === currentUser.id}
                          forumId={forumId}
                          initialState={initialCommentEditActionState}
                          postId={postId}
                          trailingActions={
                            comment.authorUserId === currentUser.id || isAdmin ? (
                              <form action={deleteComment}>
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
                              filename={attachment.originalFilename}
                              mimeType={attachment.mimeType}
                              sizeBytes={attachment.sizeBytes}
                              storagePath={attachment.storagePath}
                            />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  )
                ))}
              </div>
            )}
            <CommentComposer
              action={createCommentAction}
              channelId={channelId}
              currentUserName={currentUser.displayName}
              forumId={forumId}
              initialState={initialCommentCreateActionState}
              postId={postId}
            />
          </SectionCard>
        </div>
        <SectionCard title="投稿情報">
          <dl className="grid gap-3">
            <MetadataRow label="投稿者" value={post.authorUser.displayName} />
            {post.status ? (
              <MetadataRow label="状態" value={<PostStatusBadge status={post.status} />} />
            ) : null}
            <MetadataRow label="添付数" value={post.attachments.length} />
            <MetadataRow label="コメント数" value={post.comments.length} />
            <MetadataRow label="作成日時" value={formatDateTime(post.createdAt)} />
            <MetadataRow label="更新日時" value={formatDateTime(post.updatedAt)} />
          </dl>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-950">状態を変更</h3>
            <p className="mt-1 text-sm text-slate-600">
              フォーラム参加者であれば、だれでも状態を更新できます。
            </p>
            <div className="mt-3">
              <PostStatusForm
                action={updatePostStatusAction}
                channelId={channelId}
                currentStatus={post.status}
                forumId={forumId}
                initialState={initialPostStatusActionState}
                postId={postId}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {post.attachments.map((attachment) => (
              <AttachmentLink
                key={attachment.id}
                filename={attachment.originalFilename}
                mimeType={attachment.mimeType}
                sizeBytes={attachment.sizeBytes}
                storagePath={attachment.storagePath}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
