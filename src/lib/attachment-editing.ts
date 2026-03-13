import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/app-error";
import { requireCurrentUser } from "@/lib/auth";
import { deleteStoredAttachment } from "@/lib/attachment-storage";
import { publishChannelActivity, publishPostActivity } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";

export async function deletePostAttachment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId || !channelId || !postId || !attachmentId) {
    throw new AppError("INVALID_INPUT", "削除対象の情報が不足しています。");
  }

  const attachment = await prisma.postAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      post: {
        include: {
          channel: true,
        },
      },
    },
  });

  if (
    !attachment ||
    attachment.postId !== postId ||
    attachment.post.channelId !== channelId ||
    attachment.post.channel.forumId !== forumId
  ) {
    throw new AppError("INVALID_INPUT", "添付ファイルが見つかりません。");
  }

  if (attachment.post.authorUserId !== currentUser.id) {
    throw new AppError("FORBIDDEN", "自分の投稿の添付ファイルだけ削除できます。");
  }

  await prisma.postAttachment.delete({
    where: {
      id: attachment.id,
    },
  });

  await deleteStoredAttachment(attachment.storagePath);
  publishPostActivity(postId);
  publishChannelActivity(channelId);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}

export async function deleteCommentAttachment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const currentUser = await requireCurrentUser();

  if (!forumId || !channelId || !postId || !commentId || !attachmentId) {
    throw new AppError("INVALID_INPUT", "削除対象の情報が不足しています。");
  }

  const attachment = await prisma.commentAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      comment: {
        include: {
          post: {
            include: {
              channel: true,
            },
          },
        },
      },
    },
  });

  if (
    !attachment ||
    attachment.commentId !== commentId ||
    attachment.comment.postId !== postId ||
    attachment.comment.post.channelId !== channelId ||
    attachment.comment.post.channel.forumId !== forumId
  ) {
    throw new AppError("INVALID_INPUT", "添付ファイルが見つかりません。");
  }

  if (attachment.comment.authorUserId !== currentUser.id) {
    throw new AppError("FORBIDDEN", "自分のコメントの添付ファイルだけ削除できます。");
  }

  await prisma.commentAttachment.delete({
    where: {
      id: attachment.id,
    },
  });

  await deleteStoredAttachment(attachment.storagePath);
  publishPostActivity(postId);
  publishChannelActivity(channelId);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}
