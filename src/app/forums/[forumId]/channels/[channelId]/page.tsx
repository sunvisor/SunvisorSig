import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { formatDateTime } from "@/lib/date-time";
import { getChannel } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

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
      themeStyle={getForumPageStyle(channel.forum)}
      heroStyle={getForumHeroStyle(channel.forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { href: `/forums/${channel.forum.id}` as Route, label: channel.forum.name },
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
      <div className={ui.page.twoColumnGrid}>
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
                  className={`${ui.surface.listItem} p-5`}
                  href={
                    `/forums/${channel.forum.id}/channels/${channel.id}/posts/${post.id}` as Route
                  }
                >
                  <p className="theme-text font-medium">{post.title}</p>
                  <p className={`mt-2 ${ui.text.body}`}>{post.bodyMarkdown}</p>
                  <div className={`mt-4 flex flex-wrap gap-4 ${ui.text.meta}`}>
                    <span>Author {post.authorUser.displayName}</span>
                    <span>Comments {post.comments.length}</span>
                    <span>Files {post.attachments.length}</span>
                  </div>
                  <p className={`mt-2 ${ui.text.subtleMeta}`}>
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
