import type { Route } from "next";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildDedupedFilename } from "@/lib/attachment-filename";
import { requireCurrentUser } from "@/lib/auth";
import { publishNotificationRefresh } from "@/lib/notification-events";
import { createPostMentionNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

export async function createPost(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const currentUser = await requireCurrentUser();
  const authorUserId = currentUser.id;
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!forumId || !channelId || !title || !bodyMarkdown) {
    throw new Error("必須項目が不足しています。");
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      forum: true,
    },
  });

  if (!channel || channel.forumId !== forumId) {
    throw new Error("チャンネルが見つかりません。");
  }

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId: authorUserId,
      },
    },
  });

  if (!membership) {
    throw new Error("このフォーラムの参加者のみ投稿できます。");
  }

  const post = await prisma.post.create({
    data: {
      channelId,
      authorUserId,
      title,
      bodyMarkdown,
    },
  });

  if (files.length > 0) {
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "posts",
      post.id,
    );
    const usedNames = new Set<string>();

    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const originalFilename = buildDedupedFilename(file.name, usedNames);
      const storagePath = `/uploads/posts/${post.id}/${originalFilename}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(path.join(uploadDir, originalFilename), buffer);

      await prisma.postAttachment.create({
        data: {
          postId: post.id,
          storagePath,
          originalFilename,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: buffer.byteLength,
        },
      });
    }
  }

  const notifiedUserIds = await createPostMentionNotifications({
    forumId,
    postId: post.id,
    actorUserId: currentUser.id,
    actorDisplayName: currentUser.displayName,
    bodyMarkdown,
  });

  publishNotificationRefresh(notifiedUserIds);

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${post.id}`);
  redirect(`/forums/${forumId}/channels/${channelId}/posts/${post.id}` as Route);
}
