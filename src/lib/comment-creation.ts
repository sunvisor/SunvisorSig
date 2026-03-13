import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { AppError, isAppError } from "@/lib/app-error";
import { saveCommentAttachments } from "@/lib/attachment-storage";
import { requireCurrentUser } from "@/lib/auth";
import {
  publishChannelActivity,
  publishNotificationRefresh,
  publishPostActivity,
} from "@/lib/notification-events";
import { createCommentNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

export const initialCommentCreateActionState = initialFormActionState;

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
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
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
    throw new AppError("INVALID_INPUT", "投稿が見つかりません。");
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
    throw new AppError("FORBIDDEN", "このフォーラムの参加者のみコメントできます。");
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorUserId,
      bodyMarkdown,
    },
  });

  await saveCommentAttachments({
    commentId: comment.id,
    files,
    createAttachment: async (attachment) => {
      await prisma.commentAttachment.create({
        data: {
          commentId: comment.id,
          ...attachment,
        },
      });
    },
  });

  const notifiedUserIds = await createCommentNotifications({
    forumId,
    postId,
    channelId,
    postAuthorUserId: post.authorUserId,
    commentId: comment.id,
    actorUserId: currentUser.id,
    actorDisplayName: currentUser.displayName,
    bodyMarkdown,
  });

  publishNotificationRefresh(notifiedUserIds);
  publishPostActivity(postId);
  publishChannelActivity(channelId);

  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}

export async function createCommentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await createComment(formData);

    return {
      ok: true,
      message: "コメントを投稿しました。",
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: "コメントの投稿に失敗しました。",
    };
  }
}
