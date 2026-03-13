import type { Route } from "next";
import type { PostStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { publishNotificationRefresh } from "@/lib/notification-events";
import { createCommentNotifications } from "@/lib/notification-service";
import { getPostStatusLabel } from "@/lib/post-status";
import { prisma } from "@/lib/prisma";

const allowedStatuses = new Set(["", "TODO", "IN_PROGRESS", "DONE"]);

export const initialPostStatusActionState = initialFormActionState;

export async function updatePostStatus(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const nextStatusValue = String(formData.get("status") ?? "");
  const currentUser = await requireCurrentUser();

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
        userId: currentUser.id,
      },
    },
  });

  if (!membership) {
    throw new AppError("FORBIDDEN", "このフォーラムの参加者だけステータスを変更できます。");
  }

  const nextStatus: PostStatus | null =
    nextStatusValue === "" ? null : (nextStatusValue as PostStatus);

  if (post.status === nextStatus) {
    redirect(`/forums/${forumId}/channels/${channelId}/posts/${postId}` as Route);
  }

  const statusComment = `${currentUser.displayName} が状態を「${getPostStatusLabel(nextStatus)}」に変更しました。`;
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
        authorUserId: currentUser.id,
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
      actorUserId: currentUser.id,
      actorDisplayName: currentUser.displayName,
      bodyMarkdown: statusComment,
      client: tx,
    });
  });

  publishNotificationRefresh(notifiedUserIds);

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
  redirect(`/forums/${forumId}/channels/${channelId}/posts/${postId}` as Route);
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
