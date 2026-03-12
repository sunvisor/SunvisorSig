import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { formatDateTime } from "@/lib/date-time";
import { getChannel } from "@/lib/forum-data";

type ChannelPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string }>;
}>;

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { forumId, channelId } = await params;
  const channel = await getChannel(channelId);

  if (!channel || channel.forumId !== forumId) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Channel"
      title={channel.name}
      description={channel.description ?? undefined}
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${channel.forum.id}`, label: channel.forum.name },
        { label: channel.name },
      ]}
      actions={
        <PrimaryLink
          href={`/forums/${channel.forum.id}/channels/${channel.id}/posts/new` as Route}
        >
          投稿作成
        </PrimaryLink>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="投稿一覧">
          {channel.posts.length === 0 ? (
            <EmptyState
              title="投稿がありません"
              description="最初の投稿を作成すると、ここにスレッド一覧が表示されます。"
            />
          ) : (
            <div className="grid gap-4">
              {channel.posts.map((post) => (
                <Link
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-400 hover:bg-white"
                  href={
                    `/forums/${channel.forum.id}/channels/${channel.id}/posts/${post.id}` as Route
                  }
                >
                  <p className="font-medium text-slate-950">{post.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{post.bodyMarkdown}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span>Author {post.authorUser.displayName}</span>
                    <span>Comments {post.comments.length}</span>
                    <span>Files {post.attachments.length}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Updated {formatDateTime(post.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="チャンネル情報">
          <dl className="grid gap-3">
            <MetadataRow label="フォーラム" value={channel.forum.name} />
            <MetadataRow label="投稿数" value={channel.posts.length} />
            <MetadataRow label="作成者" value={channel.createdByUser.displayName} />
            <MetadataRow label="更新日時" value={formatDateTime(channel.updatedAt)} />
          </dl>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
