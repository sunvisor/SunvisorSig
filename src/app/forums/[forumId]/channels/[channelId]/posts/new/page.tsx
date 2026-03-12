import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import { getChannel } from "@/lib/forum-data";
import { getForumThemeStyle } from "@/lib/forum-theme";
import { createPost } from "@/lib/post-creation";
import { ui } from "@/lib/ui-classes";

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
      themeStyle={getForumThemeStyle(channel.forum)}
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
        <form action={createPost} className={ui.form.layout}>
          <input name="forumId" type="hidden" value={forumId} />
          <input name="channelId" type="hidden" value={channelId} />
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="authorUserId">
              投稿者
            </label>
            <select
              className={ui.form.select}
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
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="title">
              タイトル
            </label>
            <input
              className={ui.form.input}
              id="title"
              name="title"
              placeholder="例: 初期設定の確認項目"
              required
              type="text"
            />
          </div>
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="bodyMarkdown">
              本文
            </label>
            <textarea
              className={`${ui.form.textarea} min-h-72`}
              id="bodyMarkdown"
              name="bodyMarkdown"
              placeholder={
                "Markdown で入力してください。\n\n添付は [資料](attachment:file.pdf) の形式で参照できます。"
              }
              required
            />
            <p className="text-sm leading-6 text-[color:var(--theme-text-muted)]">
              添付ファイル参照は <code>[資料](attachment:file.pdf)</code> 形式です。同名ファイルは
              自動で <code>(2)</code>, <code>(3)</code> が付きます。
            </p>
          </div>
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="attachments">
              添付ファイル
            </label>
            <input
              className={ui.form.fileInputMuted}
              id="attachments"
              multiple
              name="attachments"
              type="file"
            />
          </div>
          <div className={ui.form.actions}>
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
