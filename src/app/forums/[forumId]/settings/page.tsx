import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumForm } from "@/components/forum-form";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getForum } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { updateForum } from "@/lib/forum-management";

type ForumSettingsPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function ForumSettingsPage({ params }: ForumSettingsPageProps) {
  const { forumId } = await params;
  const forum = await getForum(forumId);

  if (!forum) {
    notFound();
  }

  const admins = forum.members
    .filter((member) => member.role === "ADMIN")
    .map((member) => ({
      id: member.userId,
      displayName: member.user.displayName,
    }));

  return (
    <ForumShell
      eyebrow="Forum"
      title="フォーラム設定"
      description="フォーラム名、説明、テーマを更新します。"
      themeStyle={getForumPageStyle(forum)}
      heroStyle={getForumHeroStyle(forum)}
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { href: `/forums/${forum.id}`, label: forum.name },
        { label: "Settings" },
      ]}
      actions={<PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>}
    >
      <SectionCard title="設定内容">
        <ForumForm
          action={updateForum}
          admins={admins}
          cancelHref={`/forums/${forum.id}` as Route}
          initialValues={{
            id: forum.id,
            name: forum.name,
            description: forum.description,
            createdByUserId: forum.createdByUserId,
            themeName: forum.themeName,
          }}
          submitLabel="設定を保存"
        />
      </SectionCard>
    </ForumShell>
  );
}
