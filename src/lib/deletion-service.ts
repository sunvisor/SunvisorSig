import { access, readdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 30;
const uploadsRoot = join(process.cwd(), "public", "uploads");

type DeleteCommentInput = {
  forumId: string;
  channelId: string;
  postId: string;
  commentId: string;
  actingUserId: string;
};

type DeletePostInput = {
  forumId: string;
  channelId: string;
  postId: string;
  actingUserId: string;
};

async function exists(pathname: string) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function toPublicFilePath(storagePath: string) {
  return join(process.cwd(), "public", storagePath.replace(/^\/+/, ""));
}

async function removeEmptyParents(startDirectory: string) {
  let current = startDirectory;

  while (current.startsWith(uploadsRoot) && current !== uploadsRoot) {
    const children = await readdir(current).catch(() => null);

    if (!children || children.length > 0) {
      return;
    }

    await rm(current, { recursive: false, force: true }).catch(() => {});
    current = dirname(current);
  }
}

function buildRetentionWindow() {
  const deletedAt = new Date();
  const purgeAfter = new Date(
    deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  return { deletedAt, purgeAfter };
}

export async function deleteCommentById({
  forumId,
  channelId,
  postId,
  commentId,
  actingUserId,
}: DeleteCommentInput) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      attachments: true,
      post: {
        include: {
          channel: true,
        },
      },
    },
  });

  if (
    !comment ||
    comment.postId !== postId ||
    comment.post.channelId !== channelId ||
    comment.post.channel.forumId !== forumId
  ) {
    throw new Error("コメントが見つかりません。");
  }

  const actingUser = await prisma.user.findUnique({
    where: { id: actingUserId },
    select: { systemRole: true },
  });

  const canDelete =
    comment.authorUserId === actingUserId || actingUser?.systemRole === "ADMIN";

  if (!canDelete) {
    throw new AppError("FORBIDDEN", "コメント作成者本人または全体管理者のみ削除できます。");
  }

  const { deletedAt, purgeAfter } = buildRetentionWindow();

  await prisma.$transaction(async (tx) => {
    if (comment.attachments.length > 0) {
      await tx.deletedAttachment.createMany({
        data: comment.attachments.map((attachment) => ({
          originalAttachmentId: attachment.id,
          ownerType: "COMMENT",
          ownerId: comment.id,
          storagePath: attachment.storagePath,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          deletedAt,
          purgeAfter,
        })),
      });
    }

    await tx.deletedComment.create({
      data: {
        originalCommentId: comment.id,
        postId: comment.postId,
        authorUserId: comment.authorUserId,
        bodyMarkdown: comment.bodyMarkdown,
        deletedByUserId: actingUserId,
        deletedAt,
        purgeAfter,
        createdAt: comment.createdAt,
      },
    });

    await tx.commentAttachment.deleteMany({
      where: { commentId: comment.id },
    });

    await tx.comment.delete({
      where: { id: comment.id },
    });
  });
}

export async function deletePostById({
  forumId,
  channelId,
  postId,
  actingUserId,
}: DeletePostInput) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      attachments: true,
      comments: {
        include: {
          attachments: true,
        },
      },
      channel: true,
    },
  });

  if (
    !post ||
    post.channelId !== channelId ||
    post.channel.forumId !== forumId
  ) {
    throw new Error("投稿が見つかりません。");
  }

  const actingUser = await prisma.user.findUnique({
    where: { id: actingUserId },
    select: { systemRole: true },
  });

  const canDelete =
    post.authorUserId === actingUserId || actingUser?.systemRole === "ADMIN";

  if (!canDelete) {
    throw new AppError("FORBIDDEN", "投稿者本人または全体管理者のみ削除できます。");
  }

  const { deletedAt, purgeAfter } = buildRetentionWindow();

  await prisma.$transaction(async (tx) => {
    const deletedAttachments = [
      ...post.attachments.map((attachment) => ({
        originalAttachmentId: attachment.id,
        ownerType: "POST" as const,
        ownerId: post.id,
        storagePath: attachment.storagePath,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        deletedAt,
        purgeAfter,
      })),
      ...post.comments.flatMap((comment) =>
        comment.attachments.map((attachment) => ({
          originalAttachmentId: attachment.id,
          ownerType: "COMMENT" as const,
          ownerId: comment.id,
          storagePath: attachment.storagePath,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          deletedAt,
          purgeAfter,
        })),
      ),
    ];

    if (deletedAttachments.length > 0) {
      await tx.deletedAttachment.createMany({
        data: deletedAttachments,
      });
    }

    if (post.comments.length > 0) {
      await tx.deletedComment.createMany({
        data: post.comments.map((comment) => ({
          originalCommentId: comment.id,
          postId: comment.postId,
          authorUserId: comment.authorUserId,
          bodyMarkdown: comment.bodyMarkdown,
          deletedByUserId: actingUserId,
          deletedAt,
          purgeAfter,
          createdAt: comment.createdAt,
        })),
      });
    }

    await tx.deletedPost.create({
      data: {
        originalPostId: post.id,
        channelId: post.channelId,
        authorUserId: post.authorUserId,
        title: post.title,
        bodyMarkdown: post.bodyMarkdown,
        deletedByUserId: actingUserId,
        deletedAt,
        purgeAfter,
        createdAt: post.createdAt,
      },
    });

    await tx.commentAttachment.deleteMany({
      where: {
        comment: {
          postId: post.id,
        },
      },
    });

    await tx.comment.deleteMany({
      where: { postId: post.id },
    });

    await tx.postAttachment.deleteMany({
      where: { postId: post.id },
    });

    await tx.post.delete({
      where: { id: post.id },
    });
  });
}

export async function purgeExpiredDeletedData(now = new Date()) {
  const expiredAttachments = await prisma.deletedAttachment.findMany({
    where: {
      purgeAfter: {
        lte: now,
      },
    },
  });

  let deletedFiles = 0;

  for (const attachment of expiredAttachments) {
    const filePath = toPublicFilePath(attachment.storagePath);

    if (await exists(filePath)) {
      await rm(filePath, { force: true });
      deletedFiles += 1;
      await removeEmptyParents(dirname(filePath));
    }
  }

  const [deletedAttachmentRecords, deletedComments, deletedPosts] =
    await prisma.$transaction([
      prisma.deletedAttachment.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
      prisma.deletedComment.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
      prisma.deletedPost.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
    ]);

  return {
    executedAt: now.toISOString(),
    uploadsRoot: relative(process.cwd(), uploadsRoot),
    deletedAttachmentRecords: deletedAttachmentRecords.count,
    deletedFiles,
    deletedComments: deletedComments.count,
    deletedPosts: deletedPosts.count,
  };
}
