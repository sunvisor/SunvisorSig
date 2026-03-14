import { SystemRole, UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { createChannelRecord } from "@/lib/channel-creation";
import { createForumRecord } from "@/lib/forum-management";
import { prisma } from "@/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  adminUserId?: string;
  forumIds: string[];
}) {
  for (const forumId of ids.forumIds) {
    await prisma.forum.delete({
      where: { id: forumId },
    }).catch(() => {});
  }

  if (ids.adminUserId) {
    await prisma.user.delete({
      where: { id: ids.adminUserId },
    }).catch(() => {});
  }
}

async function cleanupHistoricalData() {
  await prisma.forum.deleteMany({
    where: {
      name: {
        startsWith: "Creation Test ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "creation-admin-",
      },
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids = {
    adminUserId: undefined as string | undefined,
    forumIds: [] as string[],
  };

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Creation Admin ${suffix}`,
        email: `creation-admin-${suffix}@example.com`,
        mentionHandle: `creation-admin-${suffix}`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const forum = await createForumRecord({
      name: `Creation Test Forum ${suffix}`,
      description: " forum description ",
      themeName: "Ocean",
      createdByUserId: admin.id,
    });
    ids.forumIds.push(forum.id);

    assert(forum.name === `Creation Test Forum ${suffix}`, "forum name should be created");
    assert(forum.description === "forum description", "forum description should be trimmed");

    const forumMembership = await prisma.forumMember.findUnique({
      where: {
        forumId_userId: {
          forumId: forum.id,
          userId: admin.id,
        },
      },
    });
    assert(forumMembership, "forum creator should join forum as participant");

    await createForumRecord({
      name: "",
      description: "",
      themeName: "Ocean",
      createdByUserId: admin.id,
    }).then(
      () => {
        throw new Error("forum creation should require a name");
      },
      (error) => {
        assert(isAppError(error), "invalid forum creation should raise AppError");
        assert(error.code === "INVALID_INPUT", "invalid forum creation should use INVALID_INPUT");
      },
    );

    const channel = await createChannelRecord({
      forumId: forum.id,
      name: `Creation Test Channel ${suffix}`,
      description: " channel description ",
      createdByUserId: admin.id,
    });

    assert(channel.name === `Creation Test Channel ${suffix}`, "channel name should be created");
    assert(channel.description === "channel description", "channel description should be trimmed");

    await createChannelRecord({
      forumId: "00000000-0000-0000-0000-000000000000",
      name: "Broken Channel",
      description: "",
      createdByUserId: admin.id,
    }).then(
      () => {
        throw new Error("channel creation should require an existing forum");
      },
      (error) => {
        assert(isAppError(error), "invalid channel creation should raise AppError");
        assert(error.code === "INVALID_INPUT", "invalid channel creation should use INVALID_INPUT");
      },
    );

    await createChannelRecord({
      forumId: forum.id,
      name: "   ",
      description: "",
      createdByUserId: admin.id,
    }).then(
      () => {
        throw new Error("channel creation should require a name");
      },
      (error) => {
        assert(isAppError(error), "empty channel name should raise AppError");
        assert(error.code === "INVALID_INPUT", "empty channel name should use INVALID_INPUT");
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        forumId: forum.id,
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
