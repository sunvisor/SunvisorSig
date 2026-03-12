import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;

export async function deletePost(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");

  if (!forumId || !channelId || !postId) {
    throw new Error("削除対象の情報が不足しています。");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      attachments: true,
      comments: {
        include: {
          attachments: true,
        },
      },
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

  const deletedAt = new Date();
  const purgeAfter = new Date(
    deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.$transaction(async (tx) => {
    const deletedAttachments = [
      ...post.attachments.map((attachment) => ({
        originalAttachmentId: attachment.id,
        ownerType: "POST" as const,
        ownerId: post.id,
        storagePath: attachment.storagePath,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        deletedAt,
        purgeAfter,
      })),
      ...post.comments.flatMap((comment) =>
        comment.attachments.map((attachment) => ({
          originalAttachmentId: attachment.id,
          ownerType: "COMMENT" as const,
          ownerId: comment.id,
          storagePath: attachment.storagePath,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          deletedAt,
          purgeAfter,
        })),
      ),
    ];

    if (deletedAttachments.length > 0) {
      await tx.deletedAttachment.createMany({
        data: deletedAttachments,
      });
    }

    if (post.comments.length > 0) {
      await tx.deletedComment.createMany({
        data: post.comments.map((comment) => ({
          originalCommentId: comment.id,
          postId: comment.postId,
          authorUserId: comment.authorUserId,
          bodyMarkdown: comment.bodyMarkdown,
          deletedByUserId: comment.authorUserId,
          deletedAt,
          purgeAfter,
          createdAt: comment.createdAt,
        })),
      });
    }

    await tx.deletedPost.create({
      data: {
        originalPostId: post.id,
        channelId: post.channelId,
        authorUserId: post.authorUserId,
        title: post.title,
        bodyMarkdown: post.bodyMarkdown,
        deletedByUserId: post.authorUserId,
        deletedAt,
        purgeAfter,
        createdAt: post.createdAt,
      },
    });

    await tx.commentAttachment.deleteMany({
      where: {
        comment: {
          postId: post.id,
        },
      },
    });

    await tx.comment.deleteMany({
      where: { postId: post.id },
    });

    await tx.postAttachment.deleteMany({
      where: { postId: post.id },
    });

    await tx.post.delete({
      where: { id: post.id },
    });
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  redirect(`/forums/${forumId}/channels/${channelId}`);
}
