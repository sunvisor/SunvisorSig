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

export async function updateCommentRecord(input: {
  forumId: string;
  channelId: string;
  postId: string;
  commentId: string;
  bodyMarkdown: string;
  actingUser: {
    id: string;
    displayName: string;
  };
  files?: File[];
}) {
  const forumId = input.forumId;
  const channelId = input.channelId;
  const postId = input.postId;
  const commentId = input.commentId;
  const bodyMarkdown = input.bodyMarkdown.trim();
  const files = input.files ?? [];
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

  if (comment.authorUserId !== input.actingUser.id) {
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
    actorUserId: input.actingUser.id,
    actorDisplayName: input.actingUser.displayName,
    bodyMarkdown,
    notifyThreadParticipants: false,
  });

  return {
    forumId,
    channelId,
    postId,
    commentId,
    notifiedUserIds,
  };
}

export async function updateComment(formData: FormData) {
  "use server";

  const currentUser = await requireCurrentUser();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const result = await updateCommentRecord({
    forumId: String(formData.get("forumId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
    postId: String(formData.get("postId") ?? ""),
    commentId: String(formData.get("commentId") ?? ""),
    bodyMarkdown: String(formData.get("bodyMarkdown") ?? ""),
    actingUser: {
      id: currentUser.id,
      displayName: currentUser.displayName,
    },
    files,
  });

  publishNotificationRefresh(result.notifiedUserIds);
  publishPostActivity(result.postId);
  publishChannelActivity(result.channelId);

  revalidatePath(`/forums/${result.forumId}/channels/${result.channelId}/posts/${result.postId}`);
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
