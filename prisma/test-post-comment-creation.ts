import { SystemRole, UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { createCommentRecord } from "@/lib/comment-creation";
import { createPostRecord } from "@/lib/post-creation";
import { prisma } from "@/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createFile(name: string, content: string, type: string) {
  return new File([content], name, { type });
}

async function cleanup(ids: {
  adminUserId?: string;
  memberUserId?: string;
  outsiderUserId?: string;
  forumId?: string;
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
        startsWith: "Post Comment Creation Test ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "post-comment-creation-admin-" } },
        { email: { startsWith: "post-comment-creation-member-" } },
        { email: { startsWith: "post-comment-creation-outsider-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids: {
    adminUserId?: string;
    memberUserId?: string;
    outsiderUserId?: string;
    forumId?: string;
  } = {};

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Post Comment Creation Admin ${suffix}`,
        email: `post-comment-creation-admin-${suffix}@example.com`,
        mentionHandle: `post-comment-creation-admin-${suffix}`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const member = await prisma.user.create({
      data: {
        displayName: `Post Comment Creation Member ${suffix}`,
        email: `post-comment-creation-member-${suffix}@example.com`,
        mentionHandle: `post-comment-creation-member-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.memberUserId = member.id;

    const outsider = await prisma.user.create({
      data: {
        displayName: `Post Comment Creation Outsider ${suffix}`,
        email: `post-comment-creation-outsider-${suffix}@example.com`,
        mentionHandle: `post-comment-creation-outsider-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.outsiderUserId = outsider.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Post Comment Creation Test ${suffix}`,
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
        createdByUserId: admin.id,
        name: `Post Comment Creation Channel ${suffix}`,
      },
    });

    const post = await createPostRecord({
      forumId: forum.id,
      channelId: channel.id,
      authorUserId: member.id,
      title: " created title ",
      bodyMarkdown: " created body ",
      files: [createFile("notes.txt", "hello", "text/plain")],
    });

    assert(post.title === "created title", "post title should be trimmed");
    assert(post.bodyMarkdown === "created body", "post body should be trimmed");

    const postAttachment = await prisma.postAttachment.findFirst({
      where: {
        postId: post.id,
      },
    });
    assert(postAttachment, "post attachment should be created");
    assert(postAttachment.originalFilename === "notes.txt", "post attachment filename should match");

    await createPostRecord({
      forumId: forum.id,
      channelId: channel.id,
      authorUserId: outsider.id,
      title: "forbidden",
      bodyMarkdown: "forbidden",
    }).then(
      () => {
        throw new Error("outsider should not create a post");
      },
      (error) => {
        assert(isAppError(error), "outsider post creation should raise AppError");
        assert(error.code === "FORBIDDEN", "outsider post creation should use FORBIDDEN");
      },
    );

    const { comment } = await createCommentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      authorUserId: admin.id,
      bodyMarkdown: " created comment ",
      files: [createFile("reply.txt", "reply", "text/plain")],
    });

    assert(comment.bodyMarkdown === "created comment", "comment body should be trimmed");

    const commentAttachment = await prisma.commentAttachment.findFirst({
      where: {
        commentId: comment.id,
      },
    });
    assert(commentAttachment, "comment attachment should be created");
    assert(
      commentAttachment.originalFilename === "reply.txt",
      "comment attachment filename should match",
    );

    await createCommentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      authorUserId: outsider.id,
      bodyMarkdown: "forbidden comment",
    }).then(
      () => {
        throw new Error("outsider should not create a comment");
      },
      (error) => {
        assert(isAppError(error), "outsider comment creation should raise AppError");
        assert(error.code === "FORBIDDEN", "outsider comment creation should use FORBIDDEN");
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
