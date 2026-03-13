import type { Route } from "next";
import { redirect } from "next/navigation";
import { ForumShell } from "@/components/forum-shell";
import { ProfileForm } from "@/components/profile-form";
import { MetadataRow, PrimaryLink, SectionCard } from "@/components/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import {
  initialProfileActionState,
  updateProfileAction,
} from "@/lib/profile-management";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <ForumShell
      eyebrow="Profile"
      title="プロフィール"
      description="表示名、メンション用ハンドル、パスワードを更新できます。"
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { label: "プロフィール" },
      ]}
      actions={<PrimaryLink href={"/forums" as Route}>フォーラム一覧へ戻る</PrimaryLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="プロフィール編集">
          <ProfileForm
            action={updateProfileAction}
            initialState={initialProfileActionState}
            initialValues={{
              displayName: currentUser.displayName,
              email: currentUser.email,
              mentionHandle: currentUser.mentionHandle,
            }}
          />
        </SectionCard>
        <SectionCard title="現在の情報">
          <dl className="grid gap-3">
            <MetadataRow label="表示名" value={currentUser.displayName} />
            <MetadataRow label="メールアドレス" value={currentUser.email ?? "-"} />
            <MetadataRow
              label="メンション用ハンドル"
              value={currentUser.mentionHandle ? `@${currentUser.mentionHandle}` : "-"}
            />
            <MetadataRow
              label="権限"
              value={currentUser.systemRole === "ADMIN" ? "全体管理者" : "利用者"}
            />
            <MetadataRow
              label="状態"
              value={currentUser.status === "ACTIVE" ? "有効" : currentUser.status}
            />
          </dl>
        </SectionCard>
      </div>
    </ForumShell>
  );
}
