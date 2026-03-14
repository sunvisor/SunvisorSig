import type { Route } from "next";
import { Plus } from "lucide-react";
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
import { getForum, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type ForumPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function ForumPage({ params }: ForumPageProps) {
  const { forumId } = await params;
  const [forum, currentUser] = await Promise.all([getForum(forumId), getCurrentUser()]);

  if (!forum) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login" as Route);
  }

  if (!isForumMember(forum, currentUser.id)) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Forum"
      title={forum.name}
      description={forum.description ?? undefined}
      themeStyle={getForumPageStyle(forum)}
      heroStyle={getForumHeroStyle(forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { label: forum.name },
      ]}
      actions={
        isSystemAdmin(currentUser) ? (
          <>
            <PrimaryLink href={`/forums/${forum.id}/settings` as Route}>フォーラム設定</PrimaryLink>
            <PrimaryLink href={`/forums/${forum.id}/channels/new` as Route} icon={Plus}>チャンネル作成</PrimaryLink>
          </>
        ) : undefined
      }
    >
      <div className={ui.page.twoColumnGrid}>
        <SectionCard title="チャンネル">
          {forum.channels.length === 0 ? (
            <EmptyState
              title="チャンネルがありません"
              description="このフォーラムにはまだチャンネルが作成されていません。"
            />
          ) : (
            <div className="grid gap-4">
              {forum.channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`${ui.surface.listItem} p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      className="min-w-0 flex-1"
                      href={`/forums/${forum.id}/channels/${channel.id}` as Route}
                    >
                      <p className="theme-text font-medium">{channel.name}</p>
                      <p className={`mt-2 ${ui.text.body}`}>{channel.description}</p>
                      <p className={`mt-3 ${ui.text.meta}`}>
                        Posts {channel._count.posts}
                      </p>
                      <p className={`mt-2 ${ui.text.subtleMeta}`}>
                        Updated {formatDateTime(channel.updatedAt)}
                      </p>
                    </Link>
                    {isSystemAdmin(currentUser) ? (
                      <ChannelDeleteForm
                        action={deleteChannelAction}
                        channelId={channel.id}
                        forumId={forum.id}
                        initialState={initialChannelDeleteActionState}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="参加者">
          <div className={ui.list.metadataGrid}>
            {forum.members.map((member) => (
              <div
                key={member.id}
                className={`${ui.surface.mutedCard} p-4`}
              >
                <p className="theme-text font-medium">{member.user.displayName}</p>
                <p className={`mt-1 ${ui.text.meta}`}>{member.user.email ?? "メール未設定"}</p>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid gap-3">
            <MetadataRow label="フォーラムID" value={forum.id} />
            <MetadataRow label="参加人数" value={forum.members.length} />
            <MetadataRow label="更新日時" value={formatDateTime(forum.updatedAt)} />
          </dl>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
