import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import {
  EmptyState,
  MarkdownBlock,
  MetadataRow,
  PrimaryLink,
  SectionCard,
} from "@/components/forum-ui";
import { getPost } from "@/lib/forum-data";

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
            <MarkdownBlock value={post.bodyMarkdown} />
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
                      <p className="font-medium text-slate-950">
                        {comment.authorUser.displayName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Files {comment.attachments.length}
                      </p>
                    </div>
                    <div className="mt-4">
                      <MarkdownBlock value={comment.bodyMarkdown} />
                    </div>
                    {comment.attachments.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {comment.attachments.map((attachment) => (
                          <span
                            key={attachment.id}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
                          >
                            {attachment.originalFilename}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
        <SectionCard title="投稿情報">
          <dl className="grid gap-3">
            <MetadataRow label="投稿者" value={post.authorUser.displayName} />
            <MetadataRow label="添付数" value={post.attachments.length} />
            <MetadataRow label="コメント数" value={post.comments.length} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                {attachment.originalFilename}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
