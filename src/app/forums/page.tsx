import type { Route } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getForums } from "@/lib/forum-data";

export default async function ForumsPage() {
  const forums = await getForums();

  return (
    <ForumShell
      eyebrow="Forums"
      title="フォーラム一覧"
      description="参加対象のフォーラムと、その中にあるチャンネルを確認できます。"
      actions={<PrimaryLink href="/forums">一覧を更新</PrimaryLink>}
    >
      {forums.length === 0 ? (
        <EmptyState
          title="フォーラムがまだありません"
          description="seed データ投入後に、ここへフォーラム一覧が表示されます。"
        />
      ) : (
        <div className="grid gap-6">
          {forums.map((forum) => (
            <SectionCard key={forum.id} title={forum.name}>
              <div className="flex flex-col gap-5">
                <p className="text-sm leading-7 text-slate-600">{forum.description}</p>
                <dl className="grid gap-3 md:grid-cols-3">
                  <MetadataRow label="チャンネル数" value={forum._count.channels} />
                  <MetadataRow label="参加者数" value={forum.members.length} />
                  <MetadataRow
                    label="管理者"
                    value={forum.members.find((member) => member.role === "ADMIN")?.user.displayName ?? "-"}
                  />
                </dl>
                <div className="grid gap-3 md:grid-cols-2">
                  {forum.channels.map((channel) => (
                    <Link
                      key={channel.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-white"
                      href={`/forums/${forum.id}/channels/${channel.id}` as Route}
                    >
                      <p className="font-medium text-slate-950">{channel.name}</p>
                      <p className="mt-2 text-sm text-slate-600">{channel.description}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Posts {channel._count.posts}
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
