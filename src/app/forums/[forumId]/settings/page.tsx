import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ForumForm } from "@/components/forum-form";
import { ForumMemberAddForm } from "@/components/forum-member-add-form";
import { ForumDeleteForm } from "@/components/forum-delete-form";
import { ForumMemberRemoveForm } from "@/components/forum-member-remove-form";
import { ForumShell } from "@/components/forum-shell";
import { InvitationCancelForm } from "@/components/invitation-cancel-form";
import { InvitationCreateForm } from "@/components/invitation-create-form";
import { InvitationEmailPreviewButton } from "@/components/invitation-email-preview-button";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { WebhookCreateForm } from "@/components/webhook-create-form";
import { WebhookEndpointRow } from "@/components/webhook-endpoint-row";
import { getActiveUsers, getForum } from "@/lib/forum-data";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { buildInvitationEmail, hasEmailApiConfig } from "@/lib/invitation-email";
import {
  addForumMemberAction,
  createInvitationAction,
  initialForumActionState,
  initialForumMemberActionState,
  initialInvitationCancelActionState,
  initialInvitationActionState,
  cancelInvitationAction,
  removeForumMemberAction,
  updateForumAction,
} from "@/lib/forum-management";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  initialWebhookActionState,
  testWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/lib/webhook-settings";
import { formatDateTime } from "@/lib/date-time";
import {
  deleteForumAction,
  initialForumDeleteActionState,
} from "@/lib/forum-deletion";
import { ui } from "@/lib/ui-classes";

type ForumSettingsPageProps = Readonly<{
  params: Promise<{ forumId: string }>;
}>;

export default async function ForumSettingsPage({ params }: ForumSettingsPageProps) {
  const { forumId } = await params;
  const [forum, users, currentUser] = await Promise.all([
    getForum(forumId),
    getActiveUsers(),
    getCurrentUser(),
  ]);

  if (!forum) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login" as Route);
  }

  if (!isSystemAdmin(currentUser)) {
    notFound();
  }

  const candidateUsers = users.filter(
    (user) => !forum.members.some((member) => member.userId === user.id),
  );
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const emailApiConfigured = hasEmailApiConfig();

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
            action={updateForumAction}
            cancelHref={`/forums/${forum.id}` as Route}
            currentUserName={currentUser.displayName}
            initialState={initialForumActionState}
            initialValues={{
              id: forum.id,
              name: forum.name,
              description: forum.description,
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
            <ForumMemberAddForm
              action={addForumMemberAction}
              candidateUsers={candidateUsers}
              forumId={forum.id}
              initialState={initialForumMemberActionState}
            />
          )}
        </SectionCard>
      </div>
      <SectionCard title="参加者一覧">
        <div className="grid gap-4">
          {forum.members.map((member) => {
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
                <div className="grid gap-2 content-start">
                  <p className={ui.text.label}>システム権限</p>
                  <p className="theme-text text-sm font-medium">
                    {member.user.systemRole === "ADMIN" ? "全体管理者" : "利用者"}
                  </p>
                </div>
                <div className="flex items-start justify-end">
                  {member.userId === currentUser.id ? (
                    <p className={ui.text.subtleMeta}>現在のログインユーザー</p>
                  ) : (
                    <ForumMemberRemoveForm
                      action={removeForumMemberAction}
                      forumId={forum.id}
                      initialState={initialForumMemberActionState}
                      userId={member.userId}
                    />
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
                const emailPreview = buildInvitationEmail({
                  forumName: forum.name,
                  recipientEmail: invitation.email,
                  token: invitation.token,
                  expiresAt: invitation.expiresAt,
                });

                return (
                  <div key={invitation.id} className={`${ui.surface.mutedCard} grid gap-3 p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="theme-text text-base font-medium">{invitation.email}</p>
                        <div className="mt-2 flex flex-wrap gap-4">
                          <span className={ui.text.meta}>Status {invitation.status}</span>
                          <span className={ui.text.subtleMeta}>
                            Expires {formatDateTime(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                      {canCancel ? (
                        <InvitationCancelForm
                          action={cancelInvitationAction}
                          forumId={forum.id}
                          initialState={initialInvitationCancelActionState}
                          invitationId={invitation.id}
                        />
                      ) : null}
                    </div>
                    <div className={`${ui.surface.card} p-4`}>
                      <p className={ui.text.meta}>Activation URL</p>
                      <p className="theme-text mt-2 break-all text-sm leading-6">
                        {activationUrl}
                      </p>
                    </div>
                    {!emailApiConfigured ? (
                      <div className="flex justify-start">
                        <InvitationEmailPreviewButton
                          recipientEmail={invitation.email}
                          subject={emailPreview.subject}
                          text={emailPreview.text}
                        />
                      </div>
                    ) : null}
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
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Webhook 連携を追加">
          <WebhookCreateForm
            action={createWebhookEndpointAction}
            forumId={forum.id}
            initialState={initialWebhookActionState}
          />
        </SectionCard>
        <SectionCard title="Webhook 連携一覧">
          {forum.webhookEndpoints.length === 0 ? (
            <p className={ui.text.body}>このフォーラムには Webhook 設定がまだありません。</p>
          ) : (
            <div className="grid gap-4">
              {forum.webhookEndpoints.map((endpoint) => (
                <WebhookEndpointRow
                  key={endpoint.id}
                  deleteAction={deleteWebhookEndpointAction}
                  endpoint={{
                    id: endpoint.id,
                    name: endpoint.name,
                    type: endpoint.type,
                    enabled: endpoint.enabled,
                    events: endpoint.events,
                    webhookUrl: endpoint.webhookUrl,
                    createdAtLabel: formatDateTime(endpoint.createdAt),
                    createdByLabel:
                      endpoint.createdByUser.email
                        ? `${endpoint.createdByUser.displayName} (${endpoint.createdByUser.email})`
                        : endpoint.createdByUser.displayName,
                  }}
                  initialState={initialWebhookActionState}
                  testAction={testWebhookEndpointAction}
                  toggleAction={toggleWebhookEndpointAction}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      <SectionCard title="危険操作">
        <div className="grid gap-4">
          <p className={ui.text.body}>
            フォーラムを削除すると、配下のチャンネル、投稿、コメント、添付ファイル、参加者関連付け、招待がまとめて物理削除されます。
          </p>
          <ForumDeleteForm
            action={deleteForumAction}
            forumId={forum.id}
            initialState={initialForumDeleteActionState}
          />
        </div>
      </SectionCard>
    </ForumShell>
  );
}
