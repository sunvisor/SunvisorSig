import { UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { toggleChannelSubscriptionRecord } from "@/lib/channel-subscription";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  forumId?: string;
  memberUserId?: string;
  outsiderUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  for (const userId of [ids.memberUserId, ids.outsiderUserId]) {
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
        startsWith: "Subscription Test Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "subscription-member-" } },
        { email: { startsWith: "subscription-outsider-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids: {
    forumId?: string;
    memberUserId?: string;
    outsiderUserId?: string;
  } = {};

  try {
    const member = await prisma.user.create({
      data: {
        displayName: `Subscription Member ${suffix}`,
        email: `subscription-member-${suffix}@example.com`,
        mentionHandle: `subscription-member-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.memberUserId = member.id;

    const outsider = await prisma.user.create({
      data: {
        displayName: `Subscription Outsider ${suffix}`,
        email: `subscription-outsider-${suffix}@example.com`,
        mentionHandle: `subscription-outsider-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.outsiderUserId = outsider.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Subscription Test Forum ${suffix}`,
        createdByUserId: member.id,
      },
    });
    ids.forumId = forum.id;

    await prisma.forumMember.create({
      data: {
        forumId: forum.id,
        userId: member.id,
        role: "PARTICIPANT",
      },
    });

    const channel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        name: `Subscription Channel ${suffix}`,
        createdByUserId: member.id,
      },
    });

    const subscribedResult = await toggleChannelSubscriptionRecord({
      forumId: forum.id,
      channelId: channel.id,
      actingUserId: member.id,
    });
    assert(subscribedResult.subscribed === true, "first toggle should subscribe");

    const createdSubscription = await prisma.channelSubscription.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: member.id,
        },
      },
    });
    assert(createdSubscription, "subscription should be created");

    const unsubscribedResult = await toggleChannelSubscriptionRecord({
      forumId: forum.id,
      channelId: channel.id,
      actingUserId: member.id,
    });
    assert(unsubscribedResult.subscribed === false, "second toggle should unsubscribe");

    const removedSubscription = await prisma.channelSubscription.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: member.id,
        },
      },
    });
    assert(!removedSubscription, "subscription should be removed");

    await toggleChannelSubscriptionRecord({
      forumId: forum.id,
      channelId: channel.id,
      actingUserId: outsider.id,
    }).then(
      () => {
        throw new Error("non-member should not subscribe");
      },
      (error) => {
        assert(isAppError(error), "outsider subscribe should raise AppError");
        assert(error.code === "FORBIDDEN", "outsider subscribe should use FORBIDDEN");
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        channelId: channel.id,
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
