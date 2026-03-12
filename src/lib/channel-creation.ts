import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createChannel(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const createdByUserId = String(formData.get("createdByUserId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const descriptionValue = String(formData.get("description") ?? "").trim();
  const description = descriptionValue.length > 0 ? descriptionValue : null;

  if (!forumId || !createdByUserId || !name) {
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
    throw new Error("管理者のみチャンネルを作成できます。");
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
  redirect(`/forums/${forumId}/channels/${channel.id}`);
}
