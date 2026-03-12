import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { MarkdownBlock, PrimaryLink, SectionCard } from "@/components/forum-ui";
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
      eyebrow="Draft"
      title="チャンネル作成"
      description="この画面は雛形です。次の実装でフォームと保存処理を追加します。"
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${forum.id}`, label: forum.name },
        { label: "New Channel" },
      ]}
      actions={<PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>}
    >
      <SectionCard title="予定している入力項目">
        <MarkdownBlock
          value={["- チャンネル名", "- 説明", "- 作成ボタン", "", "保存先: Channel"].join("\n")}
        />
      </SectionCard>
    </ForumShell>
  );
}
