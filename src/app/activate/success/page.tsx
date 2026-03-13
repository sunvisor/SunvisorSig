import type { Route } from "next";
import { ForumShell } from "@/components/forum-shell";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";

type ActivateSuccessPageProps = Readonly<{
  searchParams: Promise<{
    forumId?: string;
  }>;
}>;

export default async function ActivateSuccessPage({
  searchParams,
}: ActivateSuccessPageProps) {
  const { forumId } = await searchParams;
  const forumHref = forumId ? (`/forums/${forumId}` as Route) : ("/forums" as Route);

  return (
    <ForumShell
      eyebrow="Activate"
      title="アカウントを有効化しました"
      description="招待の受理が完了しました。ログイン実装前のため、現時点ではフォーラム画面へ直接移動できます。"
      actions={<PrimaryLink href={forumHref}>フォーラムへ移動</PrimaryLink>}
    >
      <SectionCard title="完了">
        <p className="theme-text text-sm leading-7">
          アカウントの初期設定は完了しています。次の段階でログイン画面を追加すると、
          このページからそのままログイン導線へ接続できます。
        </p>
      </SectionCard>
    </ForumShell>
  );
}
