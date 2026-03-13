import type { Route } from "next";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { AppError, isAppError, type AppErrorCode } from "@/lib/app-error";
import { getForumThemePreset } from "@/lib/forum-theme";
import type { InvitationStatus } from "@prisma/client";

function normalizeDescription(formData: FormData) {
  const value = String(formData.get("description") ?? "").trim();

  return value.length > 0 ? value : null;
}

async function assertForumExists(forumId: string) {
  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: { id: true },
  });

  if (!forum) {
    throw new AppError("INVALID_INPUT", "対象のフォーラムが見つかりません。");
  }

  return forum;
}

function revalidateForumPaths(forumId: string) {
  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/settings`);
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

export type InvitationActionState = {
  ok: boolean;
  code?: AppErrorCode;
  message: string;
};

export const initialInvitationActionState: InvitationActionState = {
  ok: false,
  message: "",
};

export const initialForumActionState = initialFormActionState;
export const initialForumMemberActionState = initialFormActionState;

export async function createForum(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = normalizeDescription(formData);
  const themeName = String(formData.get("themeName") ?? "").trim();
  const currentUser = await requireSystemAdmin();
  const createdByUserId = currentUser.id;

  if (!name || !themeName) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const theme = getForumThemePreset(themeName);

  const forum = await prisma.forum.create({
    data: {
      name,
      description,
      createdByUserId,
      ...theme,
      members: {
        create: {
          userId: createdByUserId,
          role: "PARTICIPANT",
        },
      },
    },
  });

  revalidateForumPaths(forum.id);
  redirect(`/forums/${forum.id}` as Route);
}

export async function createForumAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await createForum(formData);
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

export async function updateForum(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = normalizeDescription(formData);
  const themeName = String(formData.get("themeName") ?? "").trim();
  await requireSystemAdmin();

  if (!forumId || !name || !themeName) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertForumExists(forumId);

  const theme = getForumThemePreset(themeName);

  await prisma.forum.update({
    where: { id: forumId },
    data: {
      name,
      description,
      ...theme,
    },
  });

  revalidateForumPaths(forumId);
  redirect(`/forums/${forumId}` as Route);
}

export async function updateForumAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updateForum(formData);
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

export async function addForumMember(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  await requireSystemAdmin();

  if (!forumId || !userId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertForumExists(forumId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("INVALID_INPUT", "有効なユーザーのみ追加できます。");
  }

  await prisma.forumMember.upsert({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
    update: {
      role: "PARTICIPANT",
    },
    create: {
      forumId,
      userId,
      role: "PARTICIPANT",
    },
  });

  revalidateForumPaths(forumId);
}

export async function addForumMemberAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await addForumMember(formData);

    return {
      ok: true,
      message: "参加者を追加しました。",
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

export async function removeForumMember(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const currentUser = await requireSystemAdmin();

  if (!forumId || !userId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertForumExists(forumId);

  const targetMembership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  if (!targetMembership) {
    throw new AppError("INVALID_INPUT", "対象の参加者が見つかりません。");
  }

  if (userId === currentUser.id) {
    throw new AppError("FORBIDDEN", "自分自身をフォーラムから外すことはできません。");
  }

  await prisma.forumMember.delete({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  revalidateForumPaths(forumId);
}

export async function removeForumMemberAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await removeForumMember(formData);

    return {
      ok: true,
      message: "参加者をフォーラムから外しました。",
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

export async function createInvitation(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const email = normalizeEmail(formData.get("email"));
  const currentUser = await requireSystemAdmin();
  const actingUserId = currentUser.id;

  if (!forumId || !email) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertForumExists(forumId);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(
      "USER_ALREADY_EXISTS",
      "既存ユーザーです。参加者管理から追加してください。",
    );
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      forumId,
      email,
      status: {
        in: ["PENDING", "ACCEPTED"] satisfies InvitationStatus[],
      },
    },
  });

  if (existingInvitation) {
    throw new AppError(
      "INVITATION_ALREADY_EXISTS",
      "このメールアドレスには、すでに有効な招待があります。",
    );
  }

  await prisma.invitation.create({
    data: {
      forumId,
      email,
      role: "PARTICIPANT",
      token: randomBytes(24).toString("hex"),
      status: "PENDING",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      createdByUserId: actingUserId,
    },
  });

  revalidateForumPaths(forumId);
}

export async function createInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  "use server";

  try {
    await createInvitation(formData);

    return {
      ok: true,
      code: undefined,
      message: "招待を作成しました。",
    };
  } catch (error) {
    return {
      ok: false,
      code: isAppError(error) ? error.code : undefined,
      message: error instanceof Error ? error.message : "招待の作成に失敗しました。",
    };
  }
}

export async function cancelInvitation(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const invitationId = String(formData.get("invitationId") ?? "");
  await requireSystemAdmin();

  if (!forumId || !invitationId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertForumExists(forumId);

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.forumId !== forumId) {
    throw new AppError("INVITATION_NOT_FOUND", "対象の招待が見つかりません。");
  }

  if (invitation.status !== "PENDING") {
    throw new AppError("INVITATION_NOT_PENDING", "未処理の招待のみ取り消せます。");
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });

  revalidateForumPaths(forumId);
}
