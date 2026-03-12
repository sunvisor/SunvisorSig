import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;

export async function deleteComment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");

  if (!forumId || !channelId || !postId || !commentId) {
    throw new Error("削除対象の情報が不足しています。");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      attachments: true,
      post: {
        include: {
          channel: true,
        },
      },
    },
  });

  if (
    !comment ||
    comment.postId !== postId ||
    comment.post.channelId !== channelId ||
    comment.post.channel.forumId !== forumId
  ) {
    throw new Error("コメントが見つかりません。");
  }

  const deletedAt = new Date();
  const purgeAfter = new Date(
    deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.$transaction(async (tx) => {
    if (comment.attachments.length > 0) {
      await tx.deletedAttachment.createMany({
        data: comment.attachments.map((attachment) => ({
          originalAttachmentId: attachment.id,
          ownerType: "COMMENT",
          ownerId: comment.id,
          storagePath: attachment.storagePath,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          deletedAt,
          purgeAfter,
        })),
      });
    }

    await tx.deletedComment.create({
      data: {
        originalCommentId: comment.id,
        postId: comment.postId,
        authorUserId: comment.authorUserId,
        bodyMarkdown: comment.bodyMarkdown,
        deletedByUserId: comment.authorUserId,
        deletedAt,
        purgeAfter,
        createdAt: comment.createdAt,
      },
    });

    await tx.commentAttachment.deleteMany({
      where: { commentId: comment.id },
    });

    await tx.comment.delete({
      where: { id: comment.id },
    });
  });

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}
