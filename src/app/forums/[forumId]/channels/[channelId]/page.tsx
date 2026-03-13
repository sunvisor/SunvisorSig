import type { Route } from "next";
import { Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ChannelPostList } from "@/components/channel-post-list";
import { ChannelPostFilters } from "@/components/channel-post-filters";
import { ChannelSubscriptionForm } from "@/components/channel-subscription-form";
import { ForumShell } from "@/components/forum-shell";
import { MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import {
  initialChannelSubscriptionActionState,
  toggleChannelSubscriptionAction,
} from "@/lib/channel-subscription";
import { formatDateTime } from "@/lib/date-time";
import { serializeChannelPost } from "@/lib/activity-presenter";
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

  const subscribed = channel.subscriptions.some(
    (subscription) => subscription.userId === currentUser.id,
  );

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
          <ChannelPostList
            channelId={channelId}
            posts={channel.posts.map((post) =>
              serializeChannelPost({
                forumId: channel.forum.id,
                channelId: channel.id,
                post,
              }),
            )}
            query={query}
            selectedStatus={selectedStatus}
          />
        </SectionCard>
        <SectionCard title="チャンネル情報">
          <dl className="grid gap-3">
            <MetadataRow label="フォーラム" value={channel.forum.name} />
            <MetadataRow label="投稿数" value={channel.posts.length} />
            <MetadataRow label="作成者" value={channel.createdByUser.displayName} />
            <MetadataRow label="更新日時" value={formatDateTime(channel.updatedAt)} />
          </dl>
          <div className="mt-6">
            <ChannelSubscriptionForm
              action={toggleChannelSubscriptionAction}
              channelId={channel.id}
              forumId={channel.forum.id}
              initialState={initialChannelSubscriptionActionState}
              subscribed={subscribed}
            />
          </div>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
