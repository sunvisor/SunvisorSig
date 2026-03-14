import { SystemRole, UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { updatePostStatusRecord } from "@/lib/post-status-editing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  forumId?: string;
  adminUserId?: string;
  memberUserId?: string;
  outsiderUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  for (const userId of [ids.adminUserId, ids.memberUserId, ids.outsiderUserId]) {
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
        startsWith: "Post Status Test ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "post-status-admin-" } },
        { email: { startsWith: "post-status-member-" } },
        { email: { startsWith: "post-status-outsider-" } },
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
    memberUserId?: string;
    outsiderUserId?: string;
  } = {};

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Post Status Admin ${suffix}`,
        email: `post-status-admin-${suffix}@example.com`,
        mentionHandle: `post-status-admin-${suffix}`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const member = await prisma.user.create({
      data: {
        displayName: `Post Status Member ${suffix}`,
        email: `post-status-member-${suffix}@example.com`,
        mentionHandle: `post-status-member-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.memberUserId = member.id;

    const outsider = await prisma.user.create({
      data: {
        displayName: `Post Status Outsider ${suffix}`,
        email: `post-status-outsider-${suffix}@example.com`,
        mentionHandle: `post-status-outsider-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.outsiderUserId = outsider.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Post Status Test ${suffix}`,
        createdByUserId: admin.id,
      },
    });
    ids.forumId = forum.id;

    await prisma.forumMember.createMany({
      data: [
        { forumId: forum.id, userId: admin.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: member.id, role: "PARTICIPANT" },
      ],
    });

    const channel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        name: `Status Channel ${suffix}`,
        createdByUserId: admin.id,
      },
    });

    const post = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: admin.id,
        title: "Status target",
        bodyMarkdown: "body",
      },
    });

    await updatePostStatusRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      nextStatusValue: "IN_PROGRESS",
      actingUser: {
        id: member.id,
        displayName: member.displayName,
      },
    });

    const updatedPost = await prisma.post.findUnique({
      where: { id: post.id },
    });
    assert(updatedPost?.status === "IN_PROGRESS", "post status should update");

    const statusComments = await prisma.comment.findMany({
      where: {
        postId: post.id,
        type: "STATUS_CHANGE",
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    assert(statusComments.length === 1, "status change should create one status comment");
    assert(
      statusComments[0]?.authorUserId === member.id,
      "status comment author should be the changing user",
    );
    assert(
      statusComments[0]?.bodyMarkdown.includes(`${member.displayName} が状態を「対応中」に変更しました。`),
      "status comment should include actor name and localized label",
    );

    const commentCountBeforeNoop = statusComments.length;

    await updatePostStatusRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      nextStatusValue: "IN_PROGRESS",
      actingUser: {
        id: admin.id,
        displayName: admin.displayName,
      },
    });

    const commentCountAfterNoop = await prisma.comment.count({
      where: {
        postId: post.id,
        type: "STATUS_CHANGE",
      },
    });
    assert(
      commentCountAfterNoop === commentCountBeforeNoop,
      "same status should not create another status comment",
    );

    await updatePostStatusRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      nextStatusValue: "DONE",
      actingUser: {
        id: outsider.id,
        displayName: outsider.displayName,
      },
    }).then(
      () => {
        throw new Error("outsider should not change status");
      },
      (error) => {
        assert(isAppError(error), "outsider status change should raise AppError");
        assert(error.code === "FORBIDDEN", "outsider status change should use FORBIDDEN");
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        postId: post.id,
        statusCommentCount: commentCountAfterNoop,
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
