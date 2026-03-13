import type { Route } from "next";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ForumForm } from "@/components/forum-form";
import { ForumShell } from "@/components/forum-shell";
import { InvitationCreateForm } from "@/components/invitation-create-form";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getActiveUsers, getForum } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import {
  addForumMember,
  cancelInvitation,
  removeForumMember,
  createInvitationAction,
  initialInvitationActionState,
  updateForum,
  updateForumMemberRole,
} from "@/lib/forum-management";
import { formatDateTime } from "@/lib/date-time";
import { ui } from "@/lib/ui-classes";

type ForumSettingsPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function ForumSettingsPage({ params }: ForumSettingsPageProps) {
  const { forumId } = await params;
  const [forum, users] = await Promise.all([getForum(forumId), getActiveUsers()]);

  if (!forum) {
    notFound();
  }

  const actingAdminId = forum.members.find((member) => member.role === "ADMIN")?.userId ?? "";
  const admins = forum.members
    .filter((member) => member.role === "ADMIN")
    .map((member) => ({
      id: member.userId,
      displayName: member.user.displayName,
    }));
  const candidateUsers = users.filter(
    (user) => !forum.members.some((member) => member.userId === user.id),
  );
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <ForumShell
      eyebrow="Forum"
      title="フォーラム設定"
      description="フォーラム名、説明、テーマを更新します。"
      themeStyle={getForumPageStyle(forum)}
      heroStyle={getForumHeroStyle(forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { href: `/forums/${forum.id}` as Route, label: forum.name },
        { label: "Settings" },
      ]}
      actions={<PrimaryLink href={`/forums/${forum.id}` as Route}>フォーラムへ戻る</PrimaryLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
        <SectionCard title="参加者追加">
          {candidateUsers.length === 0 ? (
            <p className={ui.text.body}>
              追加できるアクティブユーザーはありません。
            </p>
          ) : (
            <form action={addForumMember} className={ui.form.layout}>
              <input name="forumId" type="hidden" value={forum.id} />
              <input name="actingUserId" type="hidden" value={actingAdminId} />
              <div className={ui.form.group}>
                <label className={ui.text.label} htmlFor="userId">
                  ユーザー
                </label>
                <select className={ui.form.select} id="userId" name="userId" required>
                  {candidateUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                      {user.email ? ` (${user.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className={ui.form.group}>
                <label className={ui.text.label} htmlFor="role">
                  ロール
                </label>
                <select className={ui.form.select} defaultValue="PARTICIPANT" id="role" name="role">
                  <option value="PARTICIPANT">PARTICIPANT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className={ui.form.actions}>
                <button className={ui.button.primary} type="submit">
                  参加者を追加
                </button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>
      <SectionCard title="参加者一覧">
        <div className="grid gap-4">
          {forum.members.map((member) => {
            const isLastAdmin =
              member.role === "ADMIN" && admins.length === 1;

            return (
              <div key={member.id} className={`${ui.surface.mutedCard} grid gap-4 p-5 lg:grid-cols-[1.3fr_1fr_auto]`}>
                <div className="grid gap-2">
                  <p className="theme-text text-base font-medium">{member.user.displayName}</p>
                  <p className={ui.text.body}>{member.user.email ?? "メール未設定"}</p>
                  <div className="flex flex-wrap gap-4">
                    <span className={ui.text.meta}>Status {member.user.status}</span>
                    <span className={ui.text.subtleMeta}>
                      Joined {formatDateTime(member.joinedAt)}
                    </span>
                  </div>
                </div>
                <form action={updateForumMemberRole} className="grid gap-3">
                  <input name="forumId" type="hidden" value={forum.id} />
                  <input name="actingUserId" type="hidden" value={actingAdminId} />
                  <input name="userId" type="hidden" value={member.userId} />
                  <label className={ui.text.label} htmlFor={`role-${member.id}`}>
                    ロール
                  </label>
                  <select
                    className={ui.form.select}
                    defaultValue={member.role}
                    disabled={isLastAdmin}
                    id={`role-${member.id}`}
                    name="role"
                  >
                    <option value="PARTICIPANT">PARTICIPANT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button
                    className={ui.button.secondary}
                    disabled={isLastAdmin}
                    type="submit"
                  >
                    ロール更新
                  </button>
                </form>
                <div className="flex items-start justify-end">
                  {isLastAdmin ? (
                    <p className={ui.text.subtleMeta}>最後の管理者</p>
                  ) : (
                    <form action={removeForumMember}>
                      <input name="forumId" type="hidden" value={forum.id} />
                      <input name="actingUserId" type="hidden" value={actingAdminId} />
                      <input name="userId" type="hidden" value={member.userId} />
                      <ConfirmSubmitButton
                        className={ui.button.dangerCompact}
                        description="この参加者はフォーラム一覧とチャンネル一覧へアクセスできなくなります。"
                        message="この参加者をフォーラムから外しますか？"
                      >
                        参加者を外す
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="招待作成">
          <InvitationCreateForm
            action={createInvitationAction}
            actingUserId={actingAdminId}
            forumId={forum.id}
            initialState={initialInvitationActionState}
          />
        </SectionCard>
        <SectionCard title="招待一覧">
          {forum.invitations.length === 0 ? (
            <p className={ui.text.body}>
              まだ招待はありません。
            </p>
          ) : (
            <div className="grid gap-4">
              {forum.invitations.map((invitation) => {
                const activationUrl = `${appUrl}/activate?token=${invitation.token}`;
                const canCancel = invitation.status === "PENDING";

                return (
                  <div key={invitation.id} className={`${ui.surface.mutedCard} grid gap-3 p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="theme-text text-base font-medium">{invitation.email}</p>
                        <div className="mt-2 flex flex-wrap gap-4">
                          <span className={ui.text.meta}>Role {invitation.role}</span>
                          <span className={ui.text.meta}>Status {invitation.status}</span>
                          <span className={ui.text.subtleMeta}>
                            Expires {formatDateTime(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                      {canCancel ? (
                        <form action={cancelInvitation}>
                          <input name="forumId" type="hidden" value={forum.id} />
                          <input name="actingUserId" type="hidden" value={actingAdminId} />
                          <input name="invitationId" type="hidden" value={invitation.id} />
                          <ConfirmSubmitButton
                            className={ui.button.dangerCompact}
                            description="取り消した招待リンクは無効になります。"
                            message="この招待を取り消しますか？"
                          >
                            招待を取消
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                    <div className={`${ui.surface.card} p-4`}>
                      <p className={ui.text.meta}>Activation URL</p>
                      <p className="theme-text mt-2 break-all text-sm leading-6">
                        {activationUrl}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span className={ui.text.subtleMeta}>
                        Created {formatDateTime(invitation.createdAt)}
                      </span>
                      <span className={ui.text.subtleMeta}>
                        By {invitation.createdByUser.displayName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </ForumShell>
  );
}
