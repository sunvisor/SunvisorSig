import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { createAuditLog } from "@/lib/audit-log";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { deleteForumById } from "@/lib/deletion-service";

export const initialForumDeleteActionState = initialFormActionState;

export async function deleteForum(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!forum) {
    throw new AppError("INVALID_INPUT", "対象のフォーラムが見つかりません。");
  }

  await deleteForumById({
    forumId,
    actingUserId: currentUser.id,
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "FORUM_DELETED",
    targetType: "FORUM",
    targetId: forum.id,
    targetLabel: forum.name,
  });

  revalidatePath("/forums");
  redirect("/forums" as Route);
}

export async function deleteForumAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await deleteForum(formData);
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }

  return initialFormActionState;
}
