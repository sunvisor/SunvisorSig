import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { AppError, isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";

export async function createChannel(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const descriptionValue = String(formData.get("description") ?? "").trim();
  const description = descriptionValue.length > 0 ? descriptionValue : null;
  const currentUser = await requireSystemAdmin();
  const createdByUserId = currentUser.id;

  if (!forumId || !name) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: { id: true },
  });

  if (!forum) {
    throw new AppError("INVALID_INPUT", "対象のフォーラムが見つかりません。");
  }

  const channel = await prisma.channel.create({
    data: {
      forumId,
      createdByUserId,
      name,
      description,
    },
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/channels/${channel.id}`);
  redirect(`/forums/${forumId}/channels/${channel.id}` as Route);
}

export { initialFormActionState as initialChannelActionState };

export async function createChannelAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await createChannel(formData);
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
