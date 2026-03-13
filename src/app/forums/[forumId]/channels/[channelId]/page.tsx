import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChannelDeleteForm } from "@/components/channel-delete-form";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import {
  deleteChannelAction,
  initialChannelDeleteActionState,
} from "@/lib/channel-deletion";
import { formatDateTime } from "@/lib/date-time";
import { getChannelWithPostSearch, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type ChannelPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string }>;
  searchParams: Promise<{ q?: string }>;
}>;

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const { forumId, channelId } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [channel, currentUser] = await Promise.all([
    getChannelWithPostSearch(channelId, query),
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
          <form action="" className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              className={ui.form.input}
              defaultValue={query}
              name="q"
              placeholder="投稿タイトルや本文を検索"
              type="search"
            />
            <button className={ui.button.primary} type="submit">
              検索
            </button>
            {query ? (
              <PrimaryLink href={`/forums/${channel.forum.id}/channels/${channel.id}` as Route}>
                クリア
              </PrimaryLink>
            ) : null}
          </form>
          {query ? (
            <p className={`${ui.text.meta} mb-4`}>
              &quot;{query}&quot; の検索結果: {channel.posts.length} 件
            </p>
          ) : null}
          {channel.posts.length === 0 ? (
            <EmptyState
              title={query ? "一致する投稿がありません" : "投稿がありません"}
              description={
                query
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
          {isSystemAdmin(currentUser) ? (
            <div className="mt-6">
              <ChannelDeleteForm
                action={deleteChannelAction}
                channelId={channel.id}
                forumId={channel.forum.id}
                initialState={initialChannelDeleteActionState}
              />
            </div>
          ) : null}
        </SectionCard>
      </div>
    </ForumShell>
  );
}
