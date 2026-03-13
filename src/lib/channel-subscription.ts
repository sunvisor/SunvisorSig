import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";

export const initialChannelSubscriptionActionState = initialFormActionState;

export async function toggleChannelSubscription(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId || !channelId) {
    throw new AppError("INVALID_INPUT", "購読対象の情報が不足しています。");
  }

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId: currentUser.id,
      },
    },
  });

  if (!membership) {
    throw new AppError("FORBIDDEN", "このフォーラムの参加者のみ購読できます。");
  }

  const existing = await prisma.channelSubscription.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });

  if (existing) {
    await prisma.channelSubscription.delete({
      where: {
        channelId_userId: {
          channelId,
          userId: currentUser.id,
        },
      },
    });
  } else {
    await prisma.channelSubscription.create({
      data: {
        channelId,
        userId: currentUser.id,
      },
    });
  }

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
}

export async function toggleChannelSubscriptionAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await toggleChannelSubscription(formData);

    return {
      ok: true,
      message: "",
    };
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
}
