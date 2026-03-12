import type { Route } from "next";
import { notFound } from "next/navigation";
import { AttachmentLink } from "@/components/attachment-link";
import { CommentComposer } from "@/components/comment-composer";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ForumShell } from "@/components/forum-shell";
import {
  EmptyState,
  MetadataRow,
  PrimaryLink,
  SectionCard,
} from "@/components/forum-ui";
import { MarkdownContent } from "@/components/markdown-content";
import { createComment } from "@/lib/comment-creation";
import { deleteComment } from "@/lib/comment-deletion";
import { deletePost } from "@/lib/post-deletion";
import { formatDateTime } from "@/lib/date-time";
import { getPost } from "@/lib/forum-data";
import { getForumThemeStyle } from "@/lib/forum-theme";

type PostPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string; postId: string }>;
}>;

export default async function PostPage({ params }: PostPageProps) {
  const { forumId, channelId, postId } = await params;
  const post = await getPost(postId);

  if (
    !post ||
    post.channelId !== channelId ||
    post.channel.forumId !== forumId
  ) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Post"
      title={post.title}
      description={`${post.authorUser.displayName} による投稿`}
      themeStyle={getForumThemeStyle(post.channel.forum)}
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${post.channel.forum.id}`, label: post.channel.forum.name },
        {
          href: `/forums/${post.channel.forum.id}/channels/${post.channel.id}`,
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
            <MarkdownContent
              attachments={post.attachments}
              value={post.bodyMarkdown}
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
                      <div className="flex items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Files {comment.attachments.length}
                        </p>
                        <form action={deleteComment}>
                          <input name="forumId" type="hidden" value={forumId} />
                          <input name="channelId" type="hidden" value={channelId} />
                          <input name="postId" type="hidden" value={postId} />
                          <input name="commentId" type="hidden" value={comment.id} />
                          <ConfirmSubmitButton
                            className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                            description="添付ファイルがある場合は、その情報も削除待ちデータへ退避されます。"
                            message="このコメントを削除しますか？"
                          >
                            コメント削除
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                    <div className="mt-4">
                      <MarkdownContent
                        attachments={comment.attachments}
                        value={comment.bodyMarkdown}
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
                ))}
              </div>
            )}
            <CommentComposer
              action={createComment}
              channelId={channelId}
              forumId={forumId}
              members={post.channel.forum.members.map((member) => ({
                id: member.id,
                role: member.role,
                userId: member.userId,
                displayName: member.user.displayName,
              }))}
              postId={postId}
            />
          </SectionCard>
        </div>
        <SectionCard title="投稿情報">
          <dl className="grid gap-3">
            <MetadataRow label="投稿者" value={post.authorUser.displayName} />
            <MetadataRow label="添付数" value={post.attachments.length} />
            <MetadataRow label="コメント数" value={post.comments.length} />
            <MetadataRow label="作成日時" value={formatDateTime(post.createdAt)} />
            <MetadataRow label="更新日時" value={formatDateTime(post.updatedAt)} />
          </dl>
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
          <form action={deletePost} className="mt-6">
            <input name="forumId" type="hidden" value={forumId} />
            <input name="channelId" type="hidden" value={channelId} />
            <input name="postId" type="hidden" value={postId} />
            <ConfirmSubmitButton
              className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
              description="投稿本体、投稿添付、配下コメント、コメント添付が削除待ちデータへ退避された後に削除されます。"
              message="この投稿を削除しますか？"
            >
              投稿削除
            </ConfirmSubmitButton>
          </form>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
