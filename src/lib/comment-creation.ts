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
import {
  createCommentNotifications,
  findMentionTargetsInForum,
} from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { deliverWebhookEvent } from "@/lib/webhook-delivery";

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
  const { comment, post } = await createCommentRecord({
    forumId,
    channelId,
    postId,
    authorUserId,
    bodyMarkdown,
    files,
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
  await deliverWebhookEvent({
    type: "COMMENT_CREATED",
    title: "新しいコメント",
    summary: `${currentUser.displayName} が「${post.title}」にコメントしました。`,
    actorDisplayName: currentUser.displayName,
    forumName: post.channel.forum.name,
    channelName: post.channel.name,
    postTitle: post.title,
    href: `/forums/${forumId}/channels/${channelId}/posts/${postId}`,
  });
  const mentionTargets = await findMentionTargetsInForum({
    forumId,
    markdown: bodyMarkdown,
    actorUserId: currentUser.id,
  });
  if (mentionTargets.length > 0) {
    await deliverWebhookEvent({
      type: "MENTIONED",
      title: "コメントでメンション",
      summary: `${currentUser.displayName} が「${post.title}」のコメントでメンションしました。`,
      actorDisplayName: currentUser.displayName,
      forumName: post.channel.forum.name,
      channelName: post.channel.name,
      postTitle: post.title,
      href: `/forums/${forumId}/channels/${channelId}/posts/${postId}`,
    });
  }

  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}

export async function createCommentRecord(input: {
  forumId: string;
  channelId: string;
  postId: string;
  authorUserId: string;
  bodyMarkdown: string;
  files?: File[];
}) {
  const forumId = input.forumId;
  const channelId = input.channelId;
  const postId = input.postId;
  const authorUserId = input.authorUserId;
  const bodyMarkdown = input.bodyMarkdown.trim();
  const files = input.files ?? [];

  if (!forumId || !channelId || !postId || !bodyMarkdown) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: {
        include: {
          forum: true,
        },
      },
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

  return { comment, post };
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
