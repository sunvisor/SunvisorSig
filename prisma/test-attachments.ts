import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import {
  deleteCommentAttachmentRecord,
  deletePostAttachmentRecord,
} from "@/lib/attachment-editing";
import { prisma } from "@/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createStoredFile(storagePath: string) {
  const filePath = path.join(process.cwd(), "public", storagePath.replace(/^\/+/, ""));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "test-file");
  return filePath;
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
        startsWith: "Attachment Test Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "attachment-owner-" } },
        { email: { startsWith: "attachment-other-" } },
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
        displayName: `Attachment Owner ${suffix}`,
        email: `attachment-owner-${suffix}@example.com`,
        mentionHandle: `attachment-owner-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.ownerUserId = owner.id;

    const other = await prisma.user.create({
      data: {
        displayName: `Attachment Other ${suffix}`,
        email: `attachment-other-${suffix}@example.com`,
        mentionHandle: `attachment-other-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    ids.otherUserId = other.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Attachment Test Forum ${suffix}`,
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
        name: `Attachment Channel ${suffix}`,
        createdByUserId: owner.id,
      },
    });

    const post = await prisma.post.create({
      data: {
        channelId: channel.id,
        authorUserId: owner.id,
        title: "Attachment post",
        bodyMarkdown: "body",
      },
    });

    const postAttachment = await prisma.postAttachment.create({
      data: {
        postId: post.id,
        storagePath: `/uploads/posts/${post.id}/guide.pdf`,
        originalFilename: "guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 8,
      },
    });
    const postAttachmentPath = await createStoredFile(postAttachment.storagePath);

    await deletePostAttachmentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      attachmentId: postAttachment.id,
      actingUserId: other.id,
    }).then(
      () => {
        throw new Error("other user should not delete post attachment");
      },
      (error) => {
        assert(isAppError(error), "forbidden post attachment deletion should raise AppError");
        assert(error.code === "FORBIDDEN", "post attachment deletion should use FORBIDDEN");
      },
    );

    const postAttachmentStillExists = await prisma.postAttachment.findUnique({
      where: { id: postAttachment.id },
    });
    assert(postAttachmentStillExists, "post attachment should still exist after forbidden delete");

    await deletePostAttachmentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      attachmentId: postAttachment.id,
      actingUserId: owner.id,
    });

    const removedPostAttachment = await prisma.postAttachment.findUnique({
      where: { id: postAttachment.id },
    });
    assert(!removedPostAttachment, "owner should delete post attachment");

    const removedPostAttachmentFile = await import("node:fs/promises").then(({ access }) =>
      access(postAttachmentPath).then(
        () => true,
        () => false,
      ),
    );
    assert(!removedPostAttachmentFile, "post attachment file should be deleted");

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: owner.id,
        bodyMarkdown: "comment",
      },
    });

    const commentAttachment = await prisma.commentAttachment.create({
      data: {
        commentId: comment.id,
        storagePath: `/uploads/comments/${comment.id}/capture.png`,
        originalFilename: "capture.png",
        mimeType: "image/png",
        sizeBytes: 8,
      },
    });
    const commentAttachmentPath = await createStoredFile(commentAttachment.storagePath);

    await deleteCommentAttachmentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      commentId: comment.id,
      attachmentId: commentAttachment.id,
      actingUserId: other.id,
    }).then(
      () => {
        throw new Error("other user should not delete comment attachment");
      },
      (error) => {
        assert(isAppError(error), "forbidden comment attachment deletion should raise AppError");
        assert(error.code === "FORBIDDEN", "comment attachment deletion should use FORBIDDEN");
      },
    );

    await deleteCommentAttachmentRecord({
      forumId: forum.id,
      channelId: channel.id,
      postId: post.id,
      commentId: comment.id,
      attachmentId: commentAttachment.id,
      actingUserId: owner.id,
    });

    const removedCommentAttachment = await prisma.commentAttachment.findUnique({
      where: { id: commentAttachment.id },
    });
    assert(!removedCommentAttachment, "owner should delete comment attachment");

    const removedCommentAttachmentFile = await import("node:fs/promises").then(({ access }) =>
      access(commentAttachmentPath).then(
        () => true,
        () => false,
      ),
    );
    assert(!removedCommentAttachmentFile, "comment attachment file should be deleted");

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
