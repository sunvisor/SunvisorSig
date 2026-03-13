import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ForumForm } from "@/components/forum-form";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { createForum } from "@/lib/forum-management";

export default async function NewForumPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isSystemAdmin(currentUser)) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Forum"
      title="フォーラム作成"
      description="顧客向けの新しいフォーラムを作成し、参加者とカラーテーマを設定します。"
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { label: "New Forum" },
      ]}
      actions={<PrimaryLink href={"/forums" as Route}>フォーラム一覧へ戻る</PrimaryLink>}
    >
      <SectionCard title="新規フォーラム">
        <ForumForm
          action={createForum}
          cancelHref={"/forums" as Route}
          currentUserName={currentUser.displayName}
          submitLabel="フォーラムを作成"
        />
      </SectionCard>
    </ForumShell>
  );
}
