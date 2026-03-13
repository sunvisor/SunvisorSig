import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { createAuditLog } from "@/lib/audit-log";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { deleteChannelById } from "@/lib/deletion-service";

export const initialChannelDeleteActionState = initialFormActionState;

export async function deleteChannel(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId || !channelId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      forumId: true,
    },
  });

  if (!channel || channel.forumId !== forumId) {
    throw new AppError("INVALID_INPUT", "対象のチャンネルが見つかりません。");
  }

  await deleteChannelById({
    forumId,
    channelId,
    actingUserId: currentUser.id,
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "CHANNEL_DELETED",
    targetType: "CHANNEL",
    targetId: channel.id,
    targetLabel: channel.name,
    metadata: {
      forumId,
    },
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  redirect(`/forums/${forumId}` as Route);
}

export async function deleteChannelAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await deleteChannel(formData);
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
