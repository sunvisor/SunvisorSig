import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getForumThemePreset } from "@/lib/forum-theme";
import type { ForumRole } from "@prisma/client";

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
    throw new Error("管理者のみ操作できます。");
  }

  return membership;
}

function revalidateForumPaths(forumId: string) {
  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/settings`);
}

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
  redirect(`/forums/${forum.id}`);
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
  redirect(`/forums/${forumId}`);
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
