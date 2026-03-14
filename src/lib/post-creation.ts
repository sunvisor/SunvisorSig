import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { savePostAttachments } from "@/lib/attachment-storage";
import { AppError } from "@/lib/app-error";
import { requireCurrentUser } from "@/lib/auth";
import {
  publishChannelActivity,
  publishNotificationRefresh,
} from "@/lib/notification-events";
import {
  createPostMentionNotifications,
  findMentionTargetsInForum,
} from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { deliverWebhookEvent } from "@/lib/webhook-delivery";

export async function createPost(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const currentUser = await requireCurrentUser();
  const authorUserId = currentUser.id;
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const post = await createPostRecord({
    forumId,
    channelId,
    authorUserId,
    title,
    bodyMarkdown,
    files,
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
  publishChannelActivity(channelId);
  await deliverWebhookEvent({
    type: "POST_CREATED",
    forumId,
    title: "新しい投稿",
    summary: `${currentUser.displayName} が「${post.title}」を投稿しました。`,
    actorDisplayName: currentUser.displayName,
    forumName: post.channel.forum.name,
    channelName: post.channel.name,
    postTitle: post.title,
    href: `/forums/${forumId}/channels/${channelId}/posts/${post.id}`,
  });
  const mentionTargets = await findMentionTargetsInForum({
    forumId,
    markdown: bodyMarkdown,
    actorUserId: currentUser.id,
  });
  if (mentionTargets.length > 0) {
    await deliverWebhookEvent({
      type: "MENTIONED",
      forumId,
      title: "投稿でメンション",
      summary: `${currentUser.displayName} が投稿「${post.title}」でメンションしました。`,
      actorDisplayName: currentUser.displayName,
      forumName: post.channel.forum.name,
      channelName: post.channel.name,
      postTitle: post.title,
      href: `/forums/${forumId}/channels/${channelId}/posts/${post.id}`,
    });
  }

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${post.id}`);
  redirect(`/forums/${forumId}/channels/${channelId}/posts/${post.id}` as Route);
}

export async function createPostRecord(input: {
  forumId: string;
  channelId: string;
  authorUserId: string;
  title: string;
  bodyMarkdown: string;
  files?: File[];
}) {
  const forumId = input.forumId;
  const channelId = input.channelId;
  const authorUserId = input.authorUserId;
  const title = input.title.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  const files = input.files ?? [];

  if (!forumId || !channelId || !title || !bodyMarkdown) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      forum: true,
    },
  });

  if (!channel || channel.forumId !== forumId) {
    throw new AppError("INVALID_INPUT", "チャンネルが見つかりません。");
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
    throw new AppError("FORBIDDEN", "このフォーラムの参加者のみ投稿できます。");
  }

  const post = await prisma.post.create({
    data: {
      channelId,
      authorUserId,
      title,
      bodyMarkdown,
    },
  });

  await savePostAttachments({
    postId: post.id,
    files,
    createAttachment: async (attachment) => {
      await prisma.postAttachment.create({
        data: {
          postId: post.id,
          ...attachment,
        },
      });
    },
  });

  return prisma.post.findUniqueOrThrow({
    where: { id: post.id },
    include: {
      channel: {
        include: {
          forum: true,
        },
      },
    },
  });
}
