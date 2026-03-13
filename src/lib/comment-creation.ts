import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDedupedFilename } from "@/lib/attachment-filename";

export async function createComment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const currentUser = await requireCurrentUser();
  const authorUserId = currentUser.id;
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!forumId || !channelId || !postId || !bodyMarkdown) {
    throw new Error("必須項目が不足しています。");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: true,
    },
  });

  if (
    !post ||
    post.channelId !== channelId ||
    post.channel.forumId !== forumId
  ) {
    throw new Error("投稿が見つかりません。");
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
    throw new Error("このフォーラムの参加者のみコメントできます。");
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorUserId,
      bodyMarkdown,
    },
  });

  if (files.length > 0) {
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "comments",
      comment.id,
    );
    const usedNames = new Set<string>();

    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const originalFilename = buildDedupedFilename(file.name, usedNames);
      const storagePath = `/uploads/comments/${comment.id}/${originalFilename}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(path.join(uploadDir, originalFilename), buffer);

      await prisma.commentAttachment.create({
        data: {
          commentId: comment.id,
          storagePath,
          originalFilename,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: buffer.byteLength,
        },
      });
    }
  }

  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}
