import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { formatDateTime } from "@/lib/date-time";
import { getForum } from "@/lib/forum-data";

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
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { label: forum.name },
      ]}
      actions={
        <PrimaryLink href={`/forums/${forum.id}/channels/new` as Route}>チャンネル作成</PrimaryLink>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-white"
                  href={`/forums/${forum.id}/channels/${channel.id}` as Route}
                >
                  <p className="font-medium text-slate-950">{channel.name}</p>
                  <p className="mt-2 text-sm text-slate-600">{channel.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Posts {channel._count.posts}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Updated {formatDateTime(channel.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="参加者">
          <div className="grid gap-3">
            {forum.members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-medium text-slate-950">{member.user.displayName}</p>
                <p className="mt-1 text-sm uppercase tracking-[0.2em] text-slate-500">
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
