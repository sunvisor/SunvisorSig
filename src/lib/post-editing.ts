import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/app-error";
import { publishNotificationRefresh } from "@/lib/notification-events";
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

  if (!forumId || !channelId || !postId || !title || !bodyMarkdown) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
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

  const notifiedUserIds = await createPostMentionNotifications({
    forumId,
    postId: post.id,
    actorUserId: currentUser.id,
    actorDisplayName: currentUser.displayName,
    bodyMarkdown,
  });

  publishNotificationRefresh(notifiedUserIds);

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
  redirect(`/forums/${forumId}/channels/${channelId}/posts/${postId}` as Route);
}

export async function updatePostAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updatePost(formData);
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
