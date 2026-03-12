import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { formatDateTime } from "@/lib/date-time";
import { getForum } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type ForumPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function ForumPage({ params }: ForumPageProps) {
  const { forumId } = await params;
  const forum = await getForum(forumId);

  if (!forum) {
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
        { href: "/forums", label: "Forums" },
        { label: forum.name },
      ]}
      actions={
        <PrimaryLink href={`/forums/${forum.id}/channels/new` as Route}>チャンネル作成</PrimaryLink>
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
                <Link
                  key={channel.id}
                  className={`${ui.surface.listItem} p-4`}
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
                <p className={`mt-1 ${ui.text.meta}`}>
                  {member.role}
                </p>
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
