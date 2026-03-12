import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import { getChannel } from "@/lib/forum-data";
import { createPost } from "@/lib/post-creation";

type NewPostPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string }>;
}>;

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { forumId, channelId } = await params;
  const channel = await getChannel(channelId);

  if (!channel || channel.forumId !== forumId) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Compose"
      title="投稿作成"
      description="Markdown 本文と添付ファイルを使って新しい投稿を作成します。"
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${channel.forum.id}`, label: channel.forum.name },
        {
          href: `/forums/${channel.forum.id}/channels/${channel.id}`,
          label: channel.name,
        },
        { label: "New Post" },
      ]}
      actions={
        <PrimaryLink href={`/forums/${channel.forum.id}/channels/${channel.id}` as Route}>
          チャンネルへ戻る
        </PrimaryLink>
      }
    >
      <SectionCard title="新規投稿">
        <form action={createPost} className="grid gap-6">
          <input name="forumId" type="hidden" value={forumId} />
          <input name="channelId" type="hidden" value={channelId} />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="authorUserId">
              投稿者
            </label>
            <select
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500"
              defaultValue={channel.forum.members[0]?.userId ?? ""}
              id="authorUserId"
              name="authorUserId"
              required
            >
              {channel.forum.members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.user.displayName} ({member.role})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="title">
              タイトル
            </label>
            <input
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              id="title"
              name="title"
              placeholder="例: 初期設定の確認項目"
              required
              type="text"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="bodyMarkdown">
              本文
            </label>
            <textarea
              className="min-h-72 rounded-3xl border border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-500"
              id="bodyMarkdown"
              name="bodyMarkdown"
              placeholder={
                "Markdown で入力してください。\n\n添付は [資料](attachment:file.pdf) の形式で参照できます。"
              }
              required
            />
            <p className="text-sm leading-6 text-slate-600">
              添付ファイル参照は <code>[資料](attachment:file.pdf)</code> 形式です。同名ファイルは
              自動で <code>(2)</code>, <code>(3)</code> が付きます。
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="attachments">
              添付ファイル
            </label>
            <input
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              id="attachments"
              multiple
              name="attachments"
              type="file"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>投稿を作成</SubmitButton>
            <PrimaryLink href={`/forums/${channel.forum.id}/channels/${channel.id}` as Route}>
              キャンセル
            </PrimaryLink>
          </div>
        </form>
      </SectionCard>
    </ForumShell>
  );
}
