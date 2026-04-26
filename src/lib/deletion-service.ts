import { AppError } from "@/lib/app-error";
import {
  deleteStoredAttachment,
  getAttachmentStorageRoot,
  type AttachmentBucket,
} from "@/lib/attachment-storage";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

const RETENTION_DAYS = 30;

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

type DeleteChannelInput = {
  forumId: string;
  channelId: string;
  actingUserId: string;
};

type DeleteForumInput = {
  forumId: string;
  actingUserId: string;
};

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
        type: comment.type,
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
          type: comment.type,
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

export async function deleteChannelById({
  forumId,
  channelId,
  actingUserId,
}: DeleteChannelInput) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      posts: {
        include: {
          attachments: true,
          comments: {
            include: {
              attachments: true,
            },
          },
        },
      },
    },
  });

  if (!channel || channel.forumId !== forumId) {
    throw new Error("チャンネルが見つかりません。");
  }

  const actingUser = await prisma.user.findUnique({
    where: { id: actingUserId },
    select: { systemRole: true },
  });

  if (actingUser?.systemRole !== "ADMIN") {
    throw new AppError("FORBIDDEN", "全体管理者のみチャンネルを削除できます。");
  }

  await prisma.channel.delete({
    where: { id: channel.id },
  });
}

export async function deleteForumById({
  forumId,
  actingUserId,
}: DeleteForumInput) {
  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: { id: true },
  });

  if (!forum) {
    throw new Error("フォーラムが見つかりません。");
  }

  const actingUser = await prisma.user.findUnique({
    where: { id: actingUserId },
    select: { systemRole: true },
  });

  if (actingUser?.systemRole !== "ADMIN") {
    throw new AppError("FORBIDDEN", "全体管理者のみフォーラムを削除できます。");
  }

  await prisma.forum.delete({
    where: { id: forum.id },
  });
}

export async function purgeExpiredDeletedData(
  now = new Date(),
  client: PrismaClient = prisma,
  bucket?: AttachmentBucket,
) {
  const expiredAttachments = await client.deletedAttachment.findMany({
    where: {
      purgeAfter: {
        lte: now,
      },
    },
  });

  let deletedFiles = 0;

  for (const attachment of expiredAttachments) {
    if (await deleteStoredAttachment(attachment.storagePath, bucket)) {
      deletedFiles += 1;
    }
  }

  const [deletedAttachmentRecords, deletedComments, deletedPosts] =
    await client.$transaction([
      client.deletedAttachment.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
      client.deletedComment.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
      client.deletedPost.deleteMany({
        where: {
          purgeAfter: {
            lte: now,
          },
        },
      }),
    ]);

  return {
    executedAt: now.toISOString(),
    storageRoot: getAttachmentStorageRoot(),
    deletedAttachmentRecords: deletedAttachmentRecords.count,
    deletedFiles,
    deletedComments: deletedComments.count,
    deletedPosts: deletedPosts.count,
  };
}
