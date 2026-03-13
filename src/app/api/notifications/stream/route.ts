import { getCurrentUser } from "@/lib/auth";
import { subscribeToNotificationRefresh } from "@/lib/notification-events";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = () => {
        controller.enqueue(encoder.encode("event: refresh\ndata: now\n\n"));
      };
      const heartbeatId = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);
      const unsubscribe = subscribeToNotificationRefresh(user.id, send);

      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      return () => {
        clearInterval(heartbeatId);
        unsubscribe();
      };
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
