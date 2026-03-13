import { getCurrentUser } from "@/lib/auth";
import { subscribeToPostActivity } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { postId } = await params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: true,
    },
  });

  if (!post) {
    return new Response("Not found", { status: 404 });
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
    return new Response("Not found", { status: 404 });
  }

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let heartbeatId: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;
      cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (heartbeatId) {
          clearInterval(heartbeatId);
        }

        unsubscribe?.();
        request.signal.removeEventListener("abort", cleanup);
      };
      const send = () => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode("event: refresh\ndata: now\n\n"));
        } catch {
          cleanup();
        }
      };
      heartbeatId = setInterval(() => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);
      unsubscribe = subscribeToPostActivity(postId, send);
      request.signal.addEventListener("abort", cleanup);

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
