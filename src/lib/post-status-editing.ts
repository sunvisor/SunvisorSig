import type { Route } from "next";
import type { PostStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import {
  publishChannelActivity,
  publishNotificationRefresh,
  publishPostActivity,
} from "@/lib/notification-events";
import { createCommentNotifications } from "@/lib/notification-service";
import { getPostStatusLabel } from "@/lib/post-status";
import { prisma } from "@/lib/prisma";

const allowedStatuses = new Set(["", "TODO", "IN_PROGRESS", "DONE"]);

export const initialPostStatusActionState = initialFormActionState;

export async function updatePostStatusRecord(input: {
  forumId: string;
  channelId: string;
  postId: string;
  nextStatusValue: string;
  actingUser: {
    id: string;
    displayName: string;
  };
}) {
  const { forumId, channelId, postId, nextStatusValue, actingUser } = input;
  if (!forumId || !channelId || !postId || !allowedStatuses.has(nextStatusValue)) {
    throw new AppError("INVALID_INPUT", "ステータス変更の入力が不正です。");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: true,
    },
  });

  if (!post || post.channelId !== channelId || post.channel.forumId !== forumId) {
    throw new AppError("INVALID_INPUT", "投稿が見つかりません。");
  }

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId: actingUser.id,
      },
    },
  });

  if (!membership) {
    throw new AppError("FORBIDDEN", "このフォーラムの参加者だけステータスを変更できます。");
  }

  const nextStatus: PostStatus | null =
    nextStatusValue === "" ? null : (nextStatusValue as PostStatus);

  const redirectPath = `/forums/${forumId}/channels/${channelId}/posts/${postId}` as Route;

  if (post.status === nextStatus) {
    return {
      postId,
      channelId,
      forumId,
      nextStatus,
      notifiedUserIds: [] as string[],
      redirectPath,
    };
  }

  const statusComment = `${actingUser.displayName} が状態を「${getPostStatusLabel(nextStatus)}」に変更しました。`;
  let notifiedUserIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: post.id },
      data: {
        status: nextStatus,
      },
    });

    const comment = await tx.comment.create({
      data: {
        postId: post.id,
        authorUserId: actingUser.id,
        type: "STATUS_CHANGE",
        bodyMarkdown: statusComment,
      },
    });

    notifiedUserIds = await createCommentNotifications({
      forumId,
      postId: post.id,
      channelId,
      postAuthorUserId: post.authorUserId,
      commentId: comment.id,
      actorUserId: actingUser.id,
      actorDisplayName: actingUser.displayName,
      bodyMarkdown: statusComment,
      client: tx,
    });
  });

  return {
    postId,
    channelId,
    forumId,
    nextStatus,
    notifiedUserIds,
    redirectPath,
  };
}

export async function updatePostStatus(formData: FormData) {
  "use server";

  const currentUser = await requireCurrentUser();
  const result = await updatePostStatusRecord({
    forumId: String(formData.get("forumId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
    postId: String(formData.get("postId") ?? ""),
    nextStatusValue: String(formData.get("status") ?? ""),
    actingUser: {
      id: currentUser.id,
      displayName: currentUser.displayName,
    },
  });

  publishNotificationRefresh(result.notifiedUserIds);
  publishPostActivity(result.postId);
  publishChannelActivity(result.channelId);

  revalidatePath(`/forums/${result.forumId}/channels/${result.channelId}`);
  revalidatePath(result.redirectPath);
  redirect(result.redirectPath);
}

export async function updatePostStatusAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updatePostStatus(formData);
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }

  return initialFormActionState;
}
