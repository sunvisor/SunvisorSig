import type { Route } from "next";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppError, isAppError, type AppErrorCode } from "@/lib/app-error";
import { getForumThemePreset } from "@/lib/forum-theme";
import type { ForumRole, InvitationStatus } from "@prisma/client";

function normalizeDescription(formData: FormData) {
  const value = String(formData.get("description") ?? "").trim();

  return value.length > 0 ? value : null;
}

async function assertAdminMembership(forumId: string, userId: string) {
  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "管理者のみ操作できます。");
  }

  return membership;
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

export async function createForum(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = normalizeDescription(formData);
  const createdByUserId = String(formData.get("createdByUserId") ?? "");
  const themeName = String(formData.get("themeName") ?? "").trim();

  if (!name || !createdByUserId || !themeName) {
    throw new Error("必須項目が不足しています。");
  }

  const user = await prisma.user.findUnique({
    where: { id: createdByUserId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("有効な管理者を選択してください。");
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
          role: "ADMIN",
        },
      },
    },
  });

  revalidateForumPaths(forum.id);
  redirect(`/forums/${forum.id}` as Route);
}

export async function updateForum(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = normalizeDescription(formData);
  const createdByUserId = String(formData.get("createdByUserId") ?? "");
  const themeName = String(formData.get("themeName") ?? "").trim();

  if (!forumId || !name || !createdByUserId || !themeName) {
    throw new Error("必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, createdByUserId);

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

export async function addForumMember(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const actingUserId = String(formData.get("actingUserId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "PARTICIPANT") as ForumRole;

  if (!forumId || !actingUserId || !userId) {
    throw new Error("必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, actingUserId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("有効なユーザーのみ追加できます。");
  }

  await prisma.forumMember.upsert({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
    update: {
      role,
    },
    create: {
      forumId,
      userId,
      role,
    },
  });

  revalidateForumPaths(forumId);
}

export async function updateForumMemberRole(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const actingUserId = String(formData.get("actingUserId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as ForumRole;

  if (!forumId || !actingUserId || !userId || !role) {
    throw new Error("必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, actingUserId);

  const targetMembership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  if (!targetMembership) {
    throw new Error("対象の参加者が見つかりません。");
  }

  if (targetMembership.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.forumMember.count({
      where: {
        forumId,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error("最後の管理者は変更できません。");
    }
  }

  await prisma.forumMember.update({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
    data: {
      role,
    },
  });

  revalidateForumPaths(forumId);
}

export async function removeForumMember(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const actingUserId = String(formData.get("actingUserId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!forumId || !actingUserId || !userId) {
    throw new Error("必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, actingUserId);

  const targetMembership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  if (!targetMembership) {
    throw new Error("対象の参加者が見つかりません。");
  }

  if (targetMembership.role === "ADMIN") {
    const adminCount = await prisma.forumMember.count({
      where: {
        forumId,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error("最後の管理者は削除できません。");
    }
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

export async function createInvitation(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const actingUserId = String(formData.get("actingUserId") ?? "");
  const email = normalizeEmail(formData.get("email"));
  const role = String(formData.get("role") ?? "PARTICIPANT") as ForumRole;

  if (!forumId || !actingUserId || !email) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, actingUserId);

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
      role,
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
  const actingUserId = String(formData.get("actingUserId") ?? "");
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!forumId || !actingUserId || !invitationId) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  await assertAdminMembership(forumId, actingUserId);

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
