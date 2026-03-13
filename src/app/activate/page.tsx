import { ActivationForm } from "@/components/activation-form";
import { ForumShell } from "@/components/forum-shell";
import { EmptyState, SectionCard } from "@/components/forum-ui";
import {
  activateInvitationAction,
  getInvitationForActivation,
  initialActivationActionState,
} from "@/lib/invitation-activation";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type ActivatePageProps = Readonly<{
  searchParams: Promise<{
    token?: string;
  }>;
}>;

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { token } = await searchParams;
  const invitation = token ? await getInvitationForActivation(token) : null;
  const forum = invitation?.forum;
  const title = forum ? `${forum.name} への招待` : "招待の確認";

  return (
    <ForumShell
      eyebrow="Activate"
      title={title}
      description="招待を受け取り、表示名とパスワードを設定します。"
      heroStyle={forum ? getForumHeroStyle(forum) : undefined}
      themeStyle={forum ? getForumPageStyle(forum) : undefined}
    >
      {!token ? (
        <EmptyState
          title="招待トークンが指定されていません"
          description="招待メールに記載された URL からアクセスしてください。"
        />
      ) : !invitation ? (
        <EmptyState
          title="招待が見つかりません"
          description="URL が正しいか、すでに無効になっていないか確認してください。"
        />
      ) : invitation.activationErrorMessage ? (
        <SectionCard title="招待を利用できません">
          <div className="grid gap-4">
            <p className="theme-text text-base font-medium">
              {invitation.activationErrorMessage}
            </p>
            <dl className="grid gap-3 md:grid-cols-2">
              <div className={`${ui.surface.mutedCard} p-4`}>
                <dt className={ui.text.meta}>Email</dt>
                <dd className="theme-text mt-1 text-sm">{invitation.email}</dd>
              </div>
              <div className={`${ui.surface.mutedCard} p-4`}>
                <dt className={ui.text.meta}>Forum</dt>
                <dd className="theme-text mt-1 text-sm">{invitation.forum.name}</dd>
              </div>
            </dl>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="アカウントを有効化">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <ActivationForm
              action={activateInvitationAction}
              initialState={initialActivationActionState}
              token={invitation.token}
            />
            <div className={`${ui.surface.mutedCard} grid gap-4 p-5`}>
              <div>
                <p className={ui.text.meta}>招待先メールアドレス</p>
                <p className="theme-text mt-2 text-sm">{invitation.email}</p>
              </div>
              <div>
                <p className={ui.text.meta}>参加フォーラム</p>
                <p className="theme-text mt-2 text-sm">{invitation.forum.name}</p>
              </div>
              <div>
                <p className={ui.text.meta}>参加ロール</p>
                <p className="theme-text mt-2 text-sm">{invitation.role}</p>
              </div>
              <div>
                <p className={ui.text.meta}>有効期限</p>
                <p className="theme-text mt-2 text-sm">
                  {new Intl.DateTimeFormat("ja-JP", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(invitation.expiresAt)}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </ForumShell>
  );
}
