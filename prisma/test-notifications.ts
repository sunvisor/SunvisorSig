import { SystemRole, UserStatus } from "@prisma/client";
import { createCommentNotifications, createPostMentionNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  forumId?: string;
  adminUserId?: string;
  authorUserId?: string;
  participantUserId?: string;
  mentionUserId?: string;
  subscriberUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  for (const userId of [
    ids.adminUserId,
    ids.authorUserId,
    ids.participantUserId,
    ids.mentionUserId,
    ids.subscriberUserId,
  ]) {
    if (!userId) {
      continue;
    }

    await prisma.user.delete({
      where: { id: userId },
    }).catch(() => {});
  }
}

async function cleanupHistoricalData() {
  await prisma.forum.deleteMany({
    where: {
      name: {
        startsWith: "Notification Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "notification-admin-" } },
        { email: { startsWith: "notification-author-" } },
        { email: { startsWith: "notification-participant-" } },
        { email: { startsWith: "notification-mention-" } },
        { email: { startsWith: "notification-subscriber-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids: {
    forumId?: string;
    adminUserId?: string;
    authorUserId?: string;
    participantUserId?: string;
    mentionUserId?: string;
    subscriberUserId?: string;
  } = {};

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Notification Admin ${suffix}`,
        email: `notification-admin-${suffix}@example.com`,
        mentionHandle: `notification-admin-${suffix}`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const author = await prisma.user.create({
      data: {
        displayName: `Notification Author ${suffix}`,
        email: `notification-author-${suffix}@example.com`,
        mentionHandle: `notification-author-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.authorUserId = author.id;

    const participant = await prisma.user.create({
      data: {
        displayName: `Notification Participant ${suffix}`,
        email: `notification-participant-${suffix}@example.com`,
        mentionHandle: `notification-participant-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.participantUserId = participant.id;

    const mentionUser = await prisma.user.create({
      data: {
        displayName: `Notification Mention ${suffix}`,
        email: `notification-mention-${suffix}@example.com`,
        mentionHandle: `mention-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.mentionUserId = mentionUser.id;

    const subscriber = await prisma.user.create({
      data: {
        displayName: `Notification Subscriber ${suffix}`,
        email: `notification-subscriber-${suffix}@example.com`,
        mentionHandle: `notification-subscriber-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.subscriberUserId = subscriber.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Notification Forum ${suffix}`,
        createdByUserId: admin.id,
      },
    });
    ids.forumId = forum.id;

    await prisma.forumMember.createMany({
      data: [
        { forumId: forum.id, userId: admin.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: author.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: participant.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: mentionUser.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: subscriber.id, role: "PARTICIPANT" },
      ],
    });

    const channel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        createdByUserId: admin.id,
        name: `Notification Channel ${suffix}`,
      },
    });

    await prisma.channelSubscription.create({
      data: {
        channelId: channel.id,
        userId: subscriber.id,
      },
    });

    const post = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: author.id,
        title: "Notification post",
        bodyMarkdown: "hello world",
      },
    });

    const mentionPost = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: admin.id,
        title: "Mention post",
        bodyMarkdown: `ping @mention-${suffix}`,
      },
    });

    const postNotifiedUserIds = await createPostMentionNotifications({
      forumId: forum.id,
      postId: mentionPost.id,
      channelId: channel.id,
      actorUserId: admin.id,
      actorDisplayName: admin.displayName,
      bodyMarkdown: mentionPost.bodyMarkdown,
    });

    assert(
      postNotifiedUserIds.includes(mentionUser.id),
      "mention target should receive post notification",
    );
    assert(
      postNotifiedUserIds.includes(subscriber.id),
      "subscriber should receive channel post notification",
    );

    const priorComment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: participant.id,
        bodyMarkdown: "already participating",
      },
    });

    const newComment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: admin.id,
        bodyMarkdown: `follow up @mention-${suffix}`,
      },
    });

    const commentNotifiedUserIds = await createCommentNotifications({
      forumId: forum.id,
      postId: post.id,
      channelId: channel.id,
      postAuthorUserId: author.id,
      commentId: newComment.id,
      actorUserId: admin.id,
      actorDisplayName: admin.displayName,
      bodyMarkdown: newComment.bodyMarkdown,
    });

    assert(
      commentNotifiedUserIds.includes(author.id),
      "post author should receive comment notification",
    );
    assert(
      commentNotifiedUserIds.includes(participant.id),
      "participant should receive thread notification",
    );
    assert(
      commentNotifiedUserIds.includes(mentionUser.id),
      "mention target should receive comment mention notification",
    );
    assert(
      commentNotifiedUserIds.includes(subscriber.id),
      "subscriber should receive channel comment notification",
    );

    const subscriberNotifications = await prisma.notification.findMany({
      where: {
        userId: subscriber.id,
      },
      select: {
        type: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert(
      subscriberNotifications.some((item) => item.type === "CHANNEL_POST"),
      "subscriber is missing CHANNEL_POST notification",
    );
    assert(
      subscriberNotifications.some((item) => item.type === "CHANNEL_COMMENT"),
      "subscriber is missing CHANNEL_COMMENT notification",
    );

    console.log(
      JSON.stringify({
        postNotifications: postNotifiedUserIds.length,
        commentNotifications: commentNotifiedUserIds.length,
        subscriberNotifications: subscriberNotifications.map((item) => item.type),
        priorCommentId: priorComment.id,
      }),
    );
  } finally {
    await cleanup(ids);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
