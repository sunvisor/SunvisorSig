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

export async function updatePostRecord(input: {
  forumId: string;
  channelId: string;
  postId: string;
  title: string;
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
  const title = input.title.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  const files = input.files ?? [];
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

  if (post.authorUserId !== input.actingUser.id) {
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
    actorUserId: input.actingUser.id,
    actorDisplayName: input.actingUser.displayName,
    bodyMarkdown,
  });

  return {
    forumId,
    channelId,
    postId,
    notifiedUserIds,
  };
}

export async function updatePost(formData: FormData) {
  "use server";

  const currentUser = await requireCurrentUser();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const result = await updatePostRecord({
    forumId: String(formData.get("forumId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
    postId: String(formData.get("postId") ?? ""),
    title: String(formData.get("title") ?? ""),
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

  revalidatePath(`/forums/${result.forumId}/channels/${result.channelId}`);
  revalidatePath(`/forums/${result.forumId}/channels/${result.channelId}/posts/${result.postId}`);
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
