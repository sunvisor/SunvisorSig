import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getForumThemePreset } from "@/lib/forum-theme";

function normalizeDescription(formData: FormData) {
  const value = String(formData.get("description") ?? "").trim();

  return value.length > 0 ? value : null;
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

  revalidatePath("/forums");
  revalidatePath(`/forums/${forum.id}`);
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

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId: createdByUserId,
      },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    throw new Error("管理者のみフォーラム設定を更新できます。");
  }

  const theme = getForumThemePreset(themeName);

  await prisma.forum.update({
    where: { id: forumId },
    data: {
      name,
      description,
      ...theme,
    },
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/settings`);
  redirect(`/forums/${forumId}`);
}
