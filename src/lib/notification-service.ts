import type { Prisma, PrismaClient } from "@prisma/client";
import { publishNotificationRefresh } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";

const mentionPattern = /(^|[^\w])@([a-zA-Z0-9_-]+)/g;

type NotificationClient = Prisma.TransactionClient | PrismaClient;

function extractMentionHandles(markdown: string) {
  const handles = new Set<string>();

  for (const match of markdown.matchAll(mentionPattern)) {
    const handle = match[2]?.trim().toLowerCase();

    if (handle) {
      handles.add(handle);
    }
  }

  return [...handles];
}

async function getMentionTargets(
  client: NotificationClient,
  forumId: string,
  markdown: string,
  actorUserId: string,
) {
  const handles = extractMentionHandles(markdown);

  if (handles.length === 0) {
    return [];
  }

  return client.user.findMany({
    where: {
      id: {
        not: actorUserId,
      },
      mentionHandle: {
        in: handles,
      },
      forumMemberships: {
        some: {
          forumId,
        },
      },
    },
    select: {
      id: true,
      mentionHandle: true,
    },
  });
}

export async function createPostMentionNotifications(params: {
  forumId: string;
  postId: string;
  channelId: string;
  actorUserId: string;
  actorDisplayName: string;
  bodyMarkdown: string;
  client?: NotificationClient;
}): Promise<string[]> {
  const client = params.client ?? prisma;
  const mentionTargets = await getMentionTargets(
    client,
    params.forumId,
    params.bodyMarkdown,
    params.actorUserId,
  );

  const existingNotifications = await client.notification.findMany({
    where: {
      postId: params.postId,
      type: {
        in: ["MENTION_IN_POST", "CHANNEL_POST"],
      },
    },
    select: {
      userId: true,
    },
  });
  const existingUserIds = new Set(existingNotifications.map((notification) => notification.userId));
  const newTargets = mentionTargets.filter((target) => !existingUserIds.has(target.id));

  if (newTargets.length > 0) {
    await client.notification.createMany({
      data: newTargets.map((target) => ({
        userId: target.id,
        postId: params.postId,
        actorUserId: params.actorUserId,
        type: "MENTION_IN_POST",
        message: `${params.actorDisplayName} が投稿であなたをメンションしました。`,
      })),
    });
  }

  const notifiedUserIds = newTargets.map((target) => target.id);
  const subscribers = await client.channelSubscription.findMany({
    where: {
      channelId: params.channelId,
      userId: {
        notIn: [...existingUserIds, ...notifiedUserIds, params.actorUserId],
      },
    },
    select: {
      userId: true,
    },
  });

  if (subscribers.length > 0) {
    await client.notification.createMany({
      data: subscribers.map((subscription) => ({
        userId: subscription.userId,
        postId: params.postId,
        actorUserId: params.actorUserId,
        type: "CHANNEL_POST",
        message: `${params.actorDisplayName} が購読中のチャンネルに投稿しました。`,
      })),
    });
  }

  return [...notifiedUserIds, ...subscribers.map((subscription) => subscription.userId)];
}

export async function createCommentNotifications(params: {
  forumId: string;
  postId: string;
  channelId: string;
  postAuthorUserId: string;
  commentId: string;
  actorUserId: string;
  actorDisplayName: string;
  bodyMarkdown: string;
  notifyThreadParticipants?: boolean;
  client?: NotificationClient;
}): Promise<string[]> {
  const client = params.client ?? prisma;
  const notifyThreadParticipants = params.notifyThreadParticipants ?? true;
  const mentionTargets = await getMentionTargets(
    client,
    params.forumId,
    params.bodyMarkdown,
    params.actorUserId,
  );
  const mentionedUserIds = new Set(mentionTargets.map((target) => target.id));
  const notifications: Prisma.NotificationCreateManyInput[] = [];
  const participantUserIds = notifyThreadParticipants
    ? new Set(
        (
          await client.comment.findMany({
            where: {
              postId: params.postId,
            },
            select: {
              authorUserId: true,
            },
          })
        ).map((comment) => comment.authorUserId),
      )
    : new Set<string>();
  const existingMentionNotifications = await client.notification.findMany({
    where: {
      commentId: params.commentId,
      type: {
        in: ["COMMENT_ON_POST", "MENTION_IN_COMMENT", "CHANNEL_COMMENT"],
      },
    },
    select: {
      type: true,
      userId: true,
    },
  });
  const hasExistingCommentNotification = existingMentionNotifications.some(
    (notification) =>
      notification.type === "COMMENT_ON_POST" &&
      notification.userId === params.postAuthorUserId,
  );
  const existingCommentNotificationUserIds = new Set(
    existingMentionNotifications
      .filter((notification) => notification.type === "COMMENT_ON_POST")
      .map((notification) => notification.userId),
  );
  const existingMentionUserIds = new Set(
    existingMentionNotifications
      .filter((notification) => notification.type === "MENTION_IN_COMMENT")
      .map((notification) => notification.userId),
  );
  const existingChannelCommentUserIds = new Set(
    existingMentionNotifications
      .filter((notification) => notification.type === "CHANNEL_COMMENT")
      .map((notification) => notification.userId),
  );

  if (notifyThreadParticipants) {
    participantUserIds.add(params.postAuthorUserId);

    for (const participantUserId of participantUserIds) {
      if (
        participantUserId === params.actorUserId ||
        mentionedUserIds.has(participantUserId) ||
        existingCommentNotificationUserIds.has(participantUserId) ||
        (participantUserId === params.postAuthorUserId && hasExistingCommentNotification)
      ) {
        continue;
      }

      notifications.push({
        userId: participantUserId,
        postId: params.postId,
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        type: "COMMENT_ON_POST",
        message:
          participantUserId === params.postAuthorUserId
            ? `${params.actorDisplayName} があなたの投稿にコメントしました。`
            : `${params.actorDisplayName} が参加中の投稿にコメントしました。`,
      });
    }
  }

  notifications.push(
    ...mentionTargets
      .filter((target) => !existingMentionUserIds.has(target.id))
      .map((target) => ({
      userId: target.id,
      postId: params.postId,
      commentId: params.commentId,
      actorUserId: params.actorUserId,
      type: "MENTION_IN_COMMENT" as const,
      message: `${params.actorDisplayName} がコメントであなたをメンションしました。`,
    })),
  );

  if (notifications.length > 0) {
    await client.notification.createMany({
      data: notifications,
    });
  }

  const notifiedUserIds = notifications.map((notification) => notification.userId);
  const subscribers = notifyThreadParticipants
    ? await client.channelSubscription.findMany({
        where: {
          channelId: params.channelId,
          userId: {
            notIn: [
              ...notifiedUserIds,
              ...existingChannelCommentUserIds,
              params.actorUserId,
            ],
          },
        },
        select: {
          userId: true,
        },
      })
    : [];

  if (subscribers.length > 0) {
    await client.notification.createMany({
      data: subscribers.map((subscription) => ({
        userId: subscription.userId,
        postId: params.postId,
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        type: "CHANNEL_COMMENT",
        message: `${params.actorDisplayName} が購読中のチャンネルにコメントしました。`,
      })),
    });
  }

  return [...notifiedUserIds, ...subscribers.map((subscription) => subscription.userId)];
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      readAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      post: {
        include: {
          channel: {
            include: {
              forum: true,
            },
          },
        },
      },
    },
  });
}

export async function markPostNotificationsAsRead(userId: string, postId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      postId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  publishNotificationRefresh([userId]);
}
