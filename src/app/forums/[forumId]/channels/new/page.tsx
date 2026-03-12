import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import { createChannel } from "@/lib/channel-creation";
import { getForum } from "@/lib/forum-data";

type NewChannelPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function NewChannelPage({ params }: NewChannelPageProps) {
  const { forumId } = await params;
  const forum = await getForum(forumId);

  if (!forum) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Channel"
      title="チャンネル作成"
      description="フォーラム内に新しいチャンネルを追加します。"
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${forum.id}`, label: forum.name },
        { label: "New Channel" },
      ]}
      actions={<PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>}
    >
      <SectionCard title="新規チャンネル">
        <form action={createChannel} className="grid gap-6">
          <input name="forumId" type="hidden" value={forum.id} />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="createdByUserId">
              作成者
            </label>
            <select
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              defaultValue={
                forum.members.find((member) => member.role === "ADMIN")?.userId ?? ""
              }
              id="createdByUserId"
              name="createdByUserId"
              required
            >
              {forum.members
                .filter((member) => member.role === "ADMIN")
                .map((member) => (
                  <option key={member.id} value={member.userId}>
                    {member.user.displayName} ({member.role})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="name">
              チャンネル名
            </label>
            <input
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              id="name"
              name="name"
              placeholder="例: 導入準備"
              required
              type="text"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="description">
              説明
            </label>
            <textarea
              className="min-h-36 rounded-3xl border border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-500"
              id="description"
              name="description"
              placeholder="このチャンネルで扱う内容を入力してください。"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>チャンネルを作成</SubmitButton>
            <PrimaryLink href={`/forums/${forum.id}` as Route}>キャンセル</PrimaryLink>
          </div>
        </form>
      </SectionCard>
    </ForumShell>
  );
}
