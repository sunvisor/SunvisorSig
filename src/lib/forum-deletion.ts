import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { deleteForumById } from "@/lib/deletion-service";

export const initialForumDeleteActionState = initialFormActionState;

export async function deleteForum(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await deleteForumById({
    forumId,
    actingUserId: currentUser.id,
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
