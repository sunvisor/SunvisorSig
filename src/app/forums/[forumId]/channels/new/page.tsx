import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChannelCreateForm } from "@/components/channel-create-form";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { createChannelAction, initialChannelActionState } from "@/lib/channel-creation";
import { getForum, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";

type NewChannelPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function NewChannelPage({ params }: NewChannelPageProps) {
  const { forumId } = await params;
  const [forum, currentUser] = await Promise.all([getForum(forumId), getCurrentUser()]);

  if (!forum) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login" as Route);
  }

  if (!isForumMember(forum, currentUser.id)) {
    notFound();
  }

  if (!isSystemAdmin(currentUser)) {
    notFound();
  }

  return (
    <ForumShell
      eyebrow="Channel"
      title="チャンネル作成"
      description="フォーラム内に新しいチャンネルを追加します。"
      themeStyle={getForumPageStyle(forum)}
      heroStyle={getForumHeroStyle(forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { href: `/forums/${forum.id}` as Route, label: forum.name },
        { label: "New Channel" },
      ]}
      actions={<PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>}
    >
      <SectionCard title="新規チャンネル">
        <ChannelCreateForm
          action={createChannelAction}
          currentUserName={currentUser.displayName}
          forumHref={`/forums/${forum.id}` as Route}
          forumId={forum.id}
          initialState={initialChannelActionState}
        />
      </SectionCard>
    </ForumShell>
  );
}
