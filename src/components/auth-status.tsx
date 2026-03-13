import type { Route } from "next";
import { getCurrentUser, logoutAction } from "@/lib/auth";
import { PrimaryLink } from "@/components/forum-ui";
import { ui } from "@/lib/ui-classes";

export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return <PrimaryLink href={"/login" as Route}>ログイン</PrimaryLink>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${ui.surface.mutedCard} px-4 py-2`}>
        <p className="theme-text text-sm font-medium">{user.displayName}</p>
        <p className={ui.text.subtleMeta}>{user.email ?? "email unset"}</p>
      </div>
      <form action={logoutAction}>
        <button className={ui.button.secondary} type="submit">
          ログアウト
        </button>
      </form>
    </div>
  );
}
