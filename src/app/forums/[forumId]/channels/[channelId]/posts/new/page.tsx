import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { MarkdownBlock, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getChannel } from "@/lib/forum-data";

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
      eyebrow="Draft"
      title="投稿作成"
      description="この画面は雛形です。次の実装で Markdown 入力と添付アップロードを追加します。"
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
      <SectionCard title="予定している入力項目">
        <MarkdownBlock
          value={[
            "- タイトル",
            "- Markdown 本文",
            "- 添付ファイル追加",
            "- 投稿作成ボタン",
            "",
            "本文内では [alt](attachment:file.pdf) 記法を使用します。",
          ].join("\n")}
        />
      </SectionCard>
    </ForumShell>
  );
}
