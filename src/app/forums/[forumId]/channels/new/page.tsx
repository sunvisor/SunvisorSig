import type { Route } from "next";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import { createChannel } from "@/lib/channel-creation";
import { getForum } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

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
        <form action={createChannel} className={ui.form.layout}>
          <input name="forumId" type="hidden" value={forum.id} />
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="createdByUserId">
              作成者
            </label>
            <select
              className={ui.form.select}
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
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="name">
              チャンネル名
            </label>
            <input
              className={ui.form.input}
              id="name"
              name="name"
              placeholder="例: 導入準備"
              required
              type="text"
            />
          </div>
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="description">
              説明
            </label>
            <textarea
              className={`${ui.form.textarea} min-h-36`}
              id="description"
              name="description"
              placeholder="このチャンネルで扱う内容を入力してください。"
            />
          </div>
          <div className={ui.form.actions}>
            <SubmitButton>チャンネルを作成</SubmitButton>
            <PrimaryLink href={`/forums/${forum.id}` as Route}>キャンセル</PrimaryLink>
          </div>
        </form>
      </SectionCard>
    </ForumShell>
  );
}
