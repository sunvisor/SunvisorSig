import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import prismaClient from "@prisma/client";
import {
  deleteChannelById,
  deleteCommentById,
  deleteForumById,
  deletePostById,
  purgeExpiredDeletedData,
} from "@/lib/deletion-service";
import { prisma } from "@/lib/prisma";

const { SystemRole, UserStatus } = prismaClient;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createUploadFile(storagePath: string) {
  const filePath = join(process.cwd(), "public", storagePath.replace(/^\/+/, ""));
  await mkdir(dirname(filePath), { recursive: true }).catch(() => {});
  await writeFile(filePath, "test");
}

async function cleanupTestData(ids: {
  forumId?: string;
  adminUserId?: string;
  memberUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  if (ids.adminUserId) {
    await prisma.user.delete({
      where: { id: ids.adminUserId },
    }).catch(() => {});
  }

  if (ids.memberUserId) {
    await prisma.user.delete({
      where: { id: ids.memberUserId },
    }).catch(() => {});
  }
}

async function cleanupHistoricalTestData() {
  await prisma.forum.deleteMany({
    where: {
      name: {
        startsWith: "Deletion Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          email: {
            startsWith: "deletion-admin-",
          },
        },
        {
          email: {
            startsWith: "deletion-member-",
          },
        },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalTestData();

  const suffix = Date.now().toString();
  const createdIds: {
    forumId?: string;
    adminUserId?: string;
    memberUserId?: string;
  } = {};
  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Deletion Admin ${suffix}`,
        email: `deletion-admin-${suffix}@example.com`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    createdIds.adminUserId = admin.id;

    const member = await prisma.user.create({
      data: {
        displayName: `Deletion Member ${suffix}`,
        email: `deletion-member-${suffix}@example.com`,
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    createdIds.memberUserId = member.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Deletion Forum ${suffix}`,
        createdByUserId: admin.id,
      },
    });
    createdIds.forumId = forum.id;

    await prisma.forumMember.createMany({
      data: [
        { forumId: forum.id, userId: admin.id, role: "PARTICIPANT" },
        { forumId: forum.id, userId: member.id, role: "PARTICIPANT" },
      ],
    });

    const channel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        name: `Deletion Channel ${suffix}`,
        createdByUserId: admin.id,
      },
    });

    const commentDeletionPost = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: admin.id,
        title: "Comment deletion target",
        bodyMarkdown: "comment deletion",
      },
    });

    const commentDeletionComment = await prisma.comment.create({
      data: {
        postId: commentDeletionPost.id,
        authorUserId: member.id,
        bodyMarkdown: "delete me",
      },
    });

    const commentAttachment = await prisma.commentAttachment.create({
      data: {
        commentId: commentDeletionComment.id,
        storagePath: `/uploads/comments/${commentDeletionComment.id}/note.txt`,
        originalFilename: "note.txt",
        mimeType: "text/plain",
        sizeBytes: 4,
      },
    });

    await deleteCommentById({
      forumId: forum.id,
      channelId: channel.id,
      postId: commentDeletionPost.id,
      commentId: commentDeletionComment.id,
      actingUserId: member.id,
    });

    const deletedComment = await prisma.deletedComment.findUnique({
      where: { originalCommentId: commentDeletionComment.id },
    });
    assert(deletedComment, "deleted comment was not created");

    const deletedCommentAttachment = await prisma.deletedAttachment.findUnique({
      where: { originalAttachmentId: commentAttachment.id },
    });
    assert(deletedCommentAttachment, "deleted attachment for comment was not created");

    const removedComment = await prisma.comment.findUnique({
      where: { id: commentDeletionComment.id },
    });
    assert(!removedComment, "comment still exists after deletion");

    const postDeletionPost = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: admin.id,
        title: "Post deletion target",
        bodyMarkdown: "post deletion",
      },
    });

    const postAttachment = await prisma.postAttachment.create({
      data: {
        postId: postDeletionPost.id,
        storagePath: `/uploads/posts/${postDeletionPost.id}/guide.pdf`,
        originalFilename: "guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
      },
    });

    const nestedComment = await prisma.comment.create({
      data: {
        postId: postDeletionPost.id,
        authorUserId: member.id,
        bodyMarkdown: "nested comment",
      },
    });

    const nestedAttachment = await prisma.commentAttachment.create({
      data: {
        commentId: nestedComment.id,
        storagePath: `/uploads/comments/${nestedComment.id}/capture.png`,
        originalFilename: "capture.png",
        mimeType: "image/png",
        sizeBytes: 4,
      },
    });

    await deletePostById({
      forumId: forum.id,
      channelId: channel.id,
      postId: postDeletionPost.id,
      actingUserId: admin.id,
    });

    const deletedPost = await prisma.deletedPost.findUnique({
      where: { originalPostId: postDeletionPost.id },
    });
    assert(deletedPost, "deleted post was not created");

    const deletedNestedComment = await prisma.deletedComment.findUnique({
      where: { originalCommentId: nestedComment.id },
    });
    assert(deletedNestedComment, "deleted nested comment was not created");

    const deletedPostAttachment = await prisma.deletedAttachment.findUnique({
      where: { originalAttachmentId: postAttachment.id },
    });
    assert(deletedPostAttachment, "deleted attachment for post was not created");

    const deletedNestedAttachment = await prisma.deletedAttachment.findUnique({
      where: { originalAttachmentId: nestedAttachment.id },
    });
    assert(deletedNestedAttachment, "deleted nested attachment was not created");

    const channelDeletionChannel = await prisma.channel.create({
      data: {
        forumId: forum.id,
        name: `Deletion Archive Channel ${suffix}`,
        createdByUserId: admin.id,
      },
    });

    const channelDeletionPost = await prisma.post.create({
      data: {
        channelId: channelDeletionChannel.id,
        authorUserId: admin.id,
        title: "Channel deletion target",
        bodyMarkdown: "channel deletion",
      },
    });

    const channelPostAttachment = await prisma.postAttachment.create({
      data: {
        postId: channelDeletionPost.id,
        storagePath: `/uploads/posts/${channelDeletionPost.id}/channel-guide.pdf`,
        originalFilename: "channel-guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
      },
    });

    const channelDeletionComment = await prisma.comment.create({
      data: {
        postId: channelDeletionPost.id,
        authorUserId: member.id,
        bodyMarkdown: "channel nested comment",
      },
    });

    const channelCommentAttachment = await prisma.commentAttachment.create({
      data: {
        commentId: channelDeletionComment.id,
        storagePath: `/uploads/comments/${channelDeletionComment.id}/channel-capture.png`,
        originalFilename: "channel-capture.png",
        mimeType: "image/png",
        sizeBytes: 4,
      },
    });

    await deleteChannelById({
      forumId: forum.id,
      channelId: channelDeletionChannel.id,
      actingUserId: admin.id,
    });

    const removedChannel = await prisma.channel.findUnique({
      where: { id: channelDeletionChannel.id },
    });
    assert(!removedChannel, "channel still exists after deletion");

    const deletedChannelPost = await prisma.deletedPost.findUnique({
      where: { originalPostId: channelDeletionPost.id },
    });
    assert(!deletedChannelPost, "channel deletion should not archive posts");

    const deletedChannelComment = await prisma.deletedComment.findUnique({
      where: { originalCommentId: channelDeletionComment.id },
    });
    assert(!deletedChannelComment, "channel deletion should not archive comments");

    const deletedChannelPostAttachment = await prisma.deletedAttachment.findUnique({
      where: { originalAttachmentId: channelPostAttachment.id },
    });
    assert(!deletedChannelPostAttachment, "channel deletion should not archive post attachments");

    const deletedChannelCommentAttachment = await prisma.deletedAttachment.findUnique({
      where: { originalAttachmentId: channelCommentAttachment.id },
    });
    assert(
      !deletedChannelCommentAttachment,
      "channel deletion should not archive comment attachments",
    );

    const forumDeletionForum = await prisma.forum.create({
      data: {
        name: `Deletion Forum Root ${suffix}`,
        createdByUserId: admin.id,
      },
    });

    const forumDeletionChannel = await prisma.channel.create({
      data: {
        forumId: forumDeletionForum.id,
        name: `Deletion Forum Channel ${suffix}`,
        createdByUserId: admin.id,
      },
    });

    const forumDeletionPost = await prisma.post.create({
      data: {
        channelId: forumDeletionChannel.id,
        authorUserId: admin.id,
        title: "Forum deletion target",
        bodyMarkdown: "forum deletion",
      },
    });

    const forumDeletionComment = await prisma.comment.create({
      data: {
        postId: forumDeletionPost.id,
        authorUserId: member.id,
        bodyMarkdown: "forum nested comment",
      },
    });

    await deleteForumById({
      forumId: forumDeletionForum.id,
      actingUserId: admin.id,
    });

    const removedForum = await prisma.forum.findUnique({
      where: { id: forumDeletionForum.id },
    });
    assert(!removedForum, "forum still exists after deletion");

    const removedForumChannel = await prisma.channel.findUnique({
      where: { id: forumDeletionChannel.id },
    });
    assert(!removedForumChannel, "forum child channel still exists after deletion");

    const removedForumPost = await prisma.post.findUnique({
      where: { id: forumDeletionPost.id },
    });
    assert(!removedForumPost, "forum child post still exists after deletion");

    const removedForumComment = await prisma.comment.findUnique({
      where: { id: forumDeletionComment.id },
    });
    assert(!removedForumComment, "forum child comment still exists after deletion");

    await prisma.deletedAttachment.updateMany({
      where: {
        id: {
          in: [
            deletedCommentAttachment.id,
            deletedPostAttachment.id,
            deletedNestedAttachment.id,
          ],
        },
      },
      data: {
        purgeAfter: new Date(Date.now() - 60_000),
      },
    });

    await prisma.deletedComment.updateMany({
      where: {
        id: {
          in: [deletedComment.id, deletedNestedComment.id],
        },
      },
      data: {
        purgeAfter: new Date(Date.now() - 60_000),
      },
    });

    await prisma.deletedPost.update({
      where: { id: deletedPost.id },
      data: {
        purgeAfter: new Date(Date.now() - 60_000),
      },
    });
    await Promise.all([
      createUploadFile(deletedCommentAttachment.storagePath),
      createUploadFile(deletedPostAttachment.storagePath),
      createUploadFile(deletedNestedAttachment.storagePath),
    ]);

    const purgeResult = await purgeExpiredDeletedData(new Date());

    assert(purgeResult.deletedAttachmentRecords >= 3, "attachment purge did not run");
    assert(purgeResult.deletedComments >= 2, "comment purge did not run");
    assert(purgeResult.deletedPosts >= 1, "post purge did not run");
    assert(purgeResult.deletedFiles >= 3, "file purge did not remove local files");

    console.log(
      JSON.stringify(
        {
          status: "ok",
          deletedCommentId: commentDeletionComment.id,
          deletedPostId: postDeletionPost.id,
          purgeResult,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanupTestData(createdIds);
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
