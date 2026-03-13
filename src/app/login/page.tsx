import { redirect } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { LoginForm } from "@/components/login-form";
import { SectionCard } from "@/components/forum-ui";
import { getCurrentUser, initialLoginActionState, loginAction } from "@/lib/auth";
import { ui } from "@/lib/ui-classes";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/forums");
  }

  return (
    <ForumShell
      eyebrow="Login"
      title="ログイン"
      description="招待で作成したアカウントのメールアドレスとパスワードでログインします。"
    >
      <div className="mx-auto w-full max-w-xl">
        <SectionCard title="サインイン">
          <LoginForm action={loginAction} initialState={initialLoginActionState} />
          <div className={`${ui.surface.mutedCard} mt-6 p-4`}>
            <p className={ui.text.meta}>補足</p>
            <p className="theme-text mt-2 text-sm leading-7">
              招待をまだ受理していない場合は、フォーラム設定画面の招待一覧にある
              Activation URL からアカウントを有効化してください。
            </p>
          </div>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
