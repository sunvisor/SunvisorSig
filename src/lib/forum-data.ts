import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getActiveUsers = cache(async () => {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
});

export const getForums = cache(async (userId: string) => {
  return prisma.forum.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      createdByUser: true,
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

export function isForumMember(forum: { members: Array<{ userId: string }> }, userId: string) {
  return forum.members.some((member) => member.userId === userId);
}

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
      invitations: {
        include: {
          createdByUser: true,
        },
        orderBy: { createdAt: "desc" },
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

export const getChannelWithPostSearch = cache(
  async (channelId: string, query: string, status: string) => {
    const normalizedQuery = query.trim();
    const normalizedStatus = status.trim();
    const statusFilter =
      normalizedStatus === "NONE"
        ? null
        : normalizedStatus === "TODO" ||
            normalizedStatus === "IN_PROGRESS" ||
            normalizedStatus === "DONE"
          ? normalizedStatus
          : undefined;

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
        subscriptions: {
          select: {
            userId: true,
          },
        },
        posts: {
          where: {
            ...(normalizedQuery
              ? {
                  OR: [
                    {
                      title: {
                        contains: normalizedQuery,
                        mode: "insensitive",
                      },
                    },
                    {
                      bodyMarkdown: {
                        contains: normalizedQuery,
                        mode: "insensitive",
                      },
                    },
                  ],
                }
              : {}),
            ...(statusFilter !== undefined ? { status: statusFilter } : {}),
          },
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
  },
);

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
          subscriptions: {
            select: {
              userId: true,
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
