import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { savePostAttachments } from "@/lib/attachment-storage";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import {
  publishChannelActivity,
  publishNotificationRefresh,
  publishPostActivity,
} from "@/lib/notification-events";
import { createPostMentionNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

export const initialPostEditActionState = initialFormActionState;

export async function updatePost(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const currentUser = await requireCurrentUser();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!forumId || !channelId || !postId || !title || !bodyMarkdown) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: true,
      attachments: {
        select: {
          originalFilename: true,
        },
      },
    },
  });

  if (!post || post.channelId !== channelId || post.channel.forumId !== forumId) {
    throw new AppError("INVALID_INPUT", "投稿が見つかりません。");
  }

  if (post.authorUserId !== currentUser.id) {
    throw new AppError("FORBIDDEN", "自分の投稿だけ編集できます。");
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      title,
      bodyMarkdown,
    },
  });

  await savePostAttachments({
    postId: post.id,
    files,
    existingNames: post.attachments.map((attachment) => attachment.originalFilename),
    createAttachment: async (attachment) => {
      await prisma.postAttachment.create({
        data: {
          postId: post.id,
          ...attachment,
        },
      });
    },
  });

  const notifiedUserIds = await createPostMentionNotifications({
    forumId,
    postId: post.id,
    channelId,
    actorUserId: currentUser.id,
    actorDisplayName: currentUser.displayName,
    bodyMarkdown,
  });

  publishNotificationRefresh(notifiedUserIds);
  publishPostActivity(postId);
  publishChannelActivity(channelId);

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}

export async function updatePostAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updatePost(formData);

    return {
      ok: true,
      message: "投稿を更新しました。",
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
      message: "投稿の更新に失敗しました。",
    };
  }
}
