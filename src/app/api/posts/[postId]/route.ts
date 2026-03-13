import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializePostDetails } from "@/lib/activity-presenter";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ post: null }, { status: 401 });
  }

  const { postId } = await params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      authorUser: true,
      attachments: true,
      comments: true,
      channel: true,
    },
  });

  if (!post) {
    return NextResponse.json({ post: null }, { status: 404 });
  }

  const membership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId: post.channel.forumId,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ post: null }, { status: 404 });
  }

  return NextResponse.json({
    post: serializePostDetails(post),
  });
}
