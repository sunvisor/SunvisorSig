import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { createAuditLog } from "@/lib/audit-log";
import { AppError, isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";

export async function createChannel(formData: FormData) {
  "use server";

  const currentUser = await requireSystemAdmin();
  const channel = await createChannelRecord({
    forumId: String(formData.get("forumId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    createdByUserId: currentUser.id,
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "CHANNEL_CREATED",
    targetType: "CHANNEL",
    targetId: channel.id,
    targetLabel: channel.name,
    metadata: {
      forumId: channel.forumId,
      description: channel.description,
    },
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${channel.forumId}`);
  revalidatePath(`/forums/${channel.forumId}/channels/${channel.id}`);
  redirect(`/forums/${channel.forumId}/channels/${channel.id}` as Route);
}

export async function createChannelRecord(input: {
  forumId: string;
  name: string;
  description: string;
  createdByUserId: string;
}) {
  const forumId = input.forumId;
  const name = input.name.trim();
  const descriptionValue = input.description.trim();
  const description = descriptionValue.length > 0 ? descriptionValue : null;

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

  return prisma.channel.create({
    data: {
      forumId,
      createdByUserId: input.createdByUserId,
      name,
      description,
    },
  });
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
