import type { Route } from "next";
import { ForumForm } from "@/components/forum-form";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getActiveUsers } from "@/lib/forum-data";
import { createForum } from "@/lib/forum-management";

export default async function NewForumPage() {
  const users = await getActiveUsers();

  return (
    <ForumShell
      eyebrow="Forum"
      title="フォーラム作成"
      description="顧客向けの新しいフォーラムを作成し、管理者とカラーテーマを設定します。"
      breadcrumbs={[
        { href: "/forums", label: "Forums" },
        { label: "New Forum" },
      ]}
      actions={<PrimaryLink href="/forums">フォーラム一覧へ戻る</PrimaryLink>}
    >
      <SectionCard title="新規フォーラム">
        <ForumForm
          action={createForum}
          admins={users.map((user) => ({
            id: user.id,
            displayName: user.displayName,
          }))}
          cancelHref={"/forums" as Route}
          submitLabel="フォーラムを作成"
        />
      </SectionCard>
    </ForumShell>
  );
}
