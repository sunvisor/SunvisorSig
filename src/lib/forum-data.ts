import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getForums = cache(async () => {
  return prisma.forum.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      channels: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      },
      members: {
        include: {
          user: true,
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: {
        select: {
          channels: true,
        },
      },
    },
  });
});

export const getForum = cache(async (forumId: string) => {
  return prisma.forum.findUnique({
    where: { id: forumId },
    include: {
      channels: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      },
      members: {
        include: {
          user: true,
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
});

export const getChannel = cache(async (channelId: string) => {
  return prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      forum: {
        include: {
          members: {
            include: {
              user: true,
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
      createdByUser: true,
      posts: {
        orderBy: { updatedAt: "desc" },
        include: {
          authorUser: true,
          attachments: true,
          comments: {
            include: {
              _count: {
                select: {
                  attachments: true,
                },
              },
            },
          },
        },
      },
    },
  });
});

export const getPost = cache(async (postId: string) => {
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: {
        include: {
          forum: {
            include: {
              members: {
                include: {
                  user: true,
                },
                orderBy: { joinedAt: "asc" },
              },
            },
          },
        },
      },
      authorUser: true,
      attachments: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: true,
          attachments: true,
        },
      },
    },
  });
});
