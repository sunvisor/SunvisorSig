import type { Route } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChannelPostFilters } from "@/components/channel-post-filters";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { PostStatusBadge } from "@/components/post-status-badge";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-time";
import { getChannelWithPostSearch, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { getPostStatusLabel } from "@/lib/post-status";
import { ui } from "@/lib/ui-classes";

type ChannelPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}>;

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const { forumId, channelId } = await params;
  const { q = "", status = "" } = await searchParams;
  const query = q.trim();
  const selectedStatus = status.trim();
  const [channel, currentUser] = await Promise.all([
    getChannelWithPostSearch(channelId, query, selectedStatus),
    getCurrentUser(),
  ]);

  if (!channel || channel.forumId !== forumId) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login");
  }

  if (!isForumMember(channel.forum, currentUser.id)) {
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
        <>
          <PrimaryLink
            icon={Plus}
            href={`/forums/${channel.forum.id}/channels/${channel.id}/posts/new` as Route}
          >
            投稿作成
          </PrimaryLink>
          {isSystemAdmin(currentUser) ? (
            <PrimaryLink href={`/forums/${channel.forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>
          ) : null}
        </>
      }
    >
      <div className={ui.page.twoColumnGrid}>
        <SectionCard title="投稿一覧">
          <ChannelPostFilters initialQuery={query} initialStatus={selectedStatus} />
          {query || selectedStatus ? (
            <p className={`${ui.text.meta} mb-4`}>
              検索結果: {channel.posts.length} 件
              {query ? ` / キーワード: "${query}"` : ""}
              {selectedStatus
                ? ` / 状態: ${
                    selectedStatus === "NONE"
                      ? "状態なし"
                      : getPostStatusLabel(selectedStatus)
                  }`
                : ""}
            </p>
          ) : null}
          {channel.posts.length === 0 ? (
            <EmptyState
              title={query ? "一致する投稿がありません" : "投稿がありません"}
              description={
                query || selectedStatus
                  ? "検索条件を変えるか、キーワードをクリアしてください。"
                  : "最初の投稿を作成すると、ここにスレッド一覧が表示されます。"
              }
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
                  <div className="flex items-start justify-between gap-3">
                    <p className="theme-text font-medium">{post.title}</p>
                    {post.status ? <PostStatusBadge status={post.status} /> : null}
                  </div>
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
