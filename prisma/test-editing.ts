import { UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { updateCommentRecord } from "@/lib/comment-editing";
import { updatePostRecord } from "@/lib/post-editing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  forumId?: string;
  ownerUserId?: string;
  otherUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  for (const userId of [ids.ownerUserId, ids.otherUserId]) {
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
        startsWith: "Editing Test Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "editing-owner-" } },
        { email: { startsWith: "editing-other-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids: {
    forumId?: string;
    ownerUserId?: string;
    otherUserId?: string;
  } = {};

  try {
    const owner = await prisma.user.create({
      data: {
        displayName: `Editing Owner ${suffix}`,
        email: `editing-owner-${suffix}@example.com`,
        mentionHandle: `editing-owner-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.ownerUserId = owner.id;

    const other = await prisma.user.create({
      data: {
        displayName: `Editing Other ${suffix}`,
        email: `editing-other-${suffix}@example.com`,
        mentionHandle: `editing-other-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.otherUserId = other.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Editing Test Forum ${suffix}`,
        createdByUserId: owner.id,
      },
    });
    ids.forumId = forum.id;

    await prisma.forumMember.createMany({
      data: [
        { forumId: forum.id, userId: owner.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: other.id, role: "PARTICIPANT" },
      ],
    });

    const channel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        name: `Editing Channel ${suffix}`,
        createdByUserId: owner.id,
      },
    });

    const post = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: owner.id,
        title: "Original title",
        bodyMarkdown: "Original body",
      },
    });

    await updatePostRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      title: "Updated title",
      bodyMarkdown: "Updated body",
      actingUser: {
        id: owner.id,
        displayName: owner.displayName,
      },
    });

    const updatedPost = await prisma.post.findUnique({
      where: { id: post.id },
    });
    assert(updatedPost?.title === "Updated title", "post title should update");
    assert(updatedPost?.bodyMarkdown === "Updated body", "post body should update");

    await updatePostRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      title: "Blocked title",
      bodyMarkdown: "Blocked body",
      actingUser: {
        id: other.id,
        displayName: other.displayName,
      },
    }).then(
      () => {
        throw new Error("non-owner should not edit post");
      },
      (error) => {
        assert(isAppError(error), "non-owner post edit should raise AppError");
        assert(error.code === "FORBIDDEN", "non-owner post edit should use FORBIDDEN");
      },
    );

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: owner.id,
        bodyMarkdown: "Original comment",
      },
    });

    await updateCommentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      commentId: comment.id,
      bodyMarkdown: "Updated comment",
      actingUser: {
        id: owner.id,
        displayName: owner.displayName,
      },
    });

    const updatedComment = await prisma.comment.findUnique({
      where: { id: comment.id },
    });
    assert(updatedComment?.bodyMarkdown === "Updated comment", "comment body should update");

    await updateCommentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      commentId: comment.id,
      bodyMarkdown: "Blocked comment",
      actingUser: {
        id: other.id,
        displayName: other.displayName,
      },
    }).then(
      () => {
        throw new Error("non-owner should not edit comment");
      },
      (error) => {
        assert(isAppError(error), "non-owner comment edit should raise AppError");
        assert(error.code === "FORBIDDEN", "non-owner comment edit should use FORBIDDEN");
      },
    );

    const statusComment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: owner.id,
        type: "STATUS_CHANGE",
        bodyMarkdown: "Status changed",
      },
    });

    await updateCommentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      commentId: statusComment.id,
      bodyMarkdown: "Should fail",
      actingUser: {
        id: owner.id,
        displayName: owner.displayName,
      },
    }).then(
      () => {
        throw new Error("status change comment should not be editable");
      },
      (error) => {
        assert(isAppError(error), "status change edit should raise AppError");
        assert(error.code === "FORBIDDEN", "status change edit should use FORBIDDEN");
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        postId: post.id,
        commentId: comment.id,
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
