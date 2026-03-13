import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { saveCommentAttachments } from "@/lib/attachment-storage";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import {
  publishChannelActivity,
  publishNotificationRefresh,
  publishPostActivity,
} from "@/lib/notification-events";
import { createCommentNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

export const initialCommentEditActionState = initialFormActionState;

export async function updateComment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const currentUser = await requireCurrentUser();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!forumId || !channelId || !postId || !commentId || !bodyMarkdown) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      attachments: {
        select: {
          originalFilename: true,
        },
      },
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
    throw new AppError("INVALID_INPUT", "コメントが見つかりません。");
  }

  if (comment.authorUserId !== currentUser.id) {
    throw new AppError("FORBIDDEN", "自分のコメントだけ編集できます。");
  }

  if (comment.type !== "USER") {
    throw new AppError("FORBIDDEN", "状態変更ログは編集できません。");
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: {
      bodyMarkdown,
    },
  });

  await saveCommentAttachments({
    commentId: comment.id,
    files,
    existingNames: comment.attachments.map((attachment) => attachment.originalFilename),
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
    postAuthorUserId: comment.post.authorUserId,
    commentId: comment.id,
    actorUserId: currentUser.id,
    actorDisplayName: currentUser.displayName,
    bodyMarkdown,
    notifyThreadParticipants: false,
  });

  publishNotificationRefresh(notifiedUserIds);
  publishPostActivity(postId);
  publishChannelActivity(channelId);

  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}

export async function updateCommentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updateComment(formData);

    return {
      ok: true,
      message: "コメントを更新しました。",
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
      message: "コメントの更新に失敗しました。",
    };
  }
}
