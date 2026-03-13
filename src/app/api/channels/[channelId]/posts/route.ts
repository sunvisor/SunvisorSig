import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeChannelPost } from "@/lib/activity-presenter";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ posts: [] }, { status: 401 });
  }

  const { channelId } = await params;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const statusFilter =
    status === "NONE"
      ? null
      : status === "TODO" || status === "IN_PROGRESS" || status === "DONE"
        ? status
        : undefined;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      forum: true,
    },
  });

  if (!channel) {
    return NextResponse.json({ posts: [] }, { status: 404 });
  }

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId: channel.forumId,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ posts: [] }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: {
      channelId,
      ...(query
        ? {
            OR: [
              {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                bodyMarkdown: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(statusFilter !== undefined ? { status: statusFilter } : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      authorUser: true,
      attachments: true,
      comments: true,
    },
  });

  return NextResponse.json({
    posts: posts.map((post) =>
      serializeChannelPost({
        forumId: channel.forumId,
        channelId,
        post,
      }),
    ),
  });
}
