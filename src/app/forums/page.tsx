import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-time";
import { getForums } from "@/lib/forum-data";
import { getForumCardStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

export default async function ForumsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const forums = await getForums(currentUser.id);

  return (
    <ForumShell
      eyebrow="Forums"
      title="フォーラム一覧"
      description="参加対象のフォーラムと、その中にあるチャンネルを確認できます。"
      actions={
        <>
          {isSystemAdmin(currentUser) ? (
            <PrimaryLink href={"/forums/new" as Route}>フォーラム作成</PrimaryLink>
          ) : null}
          <PrimaryLink href={"/forums" as Route}>一覧を更新</PrimaryLink>
        </>
      }
    >
      {forums.length === 0 ? (
        <EmptyState
          title="フォーラムがまだありません"
          description="参加しているフォーラムがまだありません。招待受理か参加者追加の後にここへ表示されます。"
        />
      ) : (
        <div className={ui.page.sectionGrid}>
          {forums.map((forum) => (
            <SectionCard key={forum.id} style={getForumCardStyle(forum)} title={forum.name}>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-3 w-3 rounded-full"
                    style={{ backgroundColor: forum.themeAccent }}
                  />
                  <span className={ui.text.meta}>{forum.themeName}</span>
                </div>
                <p className={ui.text.body}>{forum.description}</p>
                <dl className={ui.list.metadataGrid3}>
                  <MetadataRow label="チャンネル数" value={forum._count.channels} />
                  <MetadataRow label="参加者数" value={forum.members.length} />
                  <MetadataRow label="作成者" value={forum.createdByUser.displayName} />
                </dl>
                <p className={ui.text.meta}>
                  Updated {formatDateTime(forum.updatedAt)}
                </p>
                <div className={ui.list.responsiveCards}>
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
                <div>
                  <PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラム詳細へ</PrimaryLink>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </ForumShell>
  );
}
