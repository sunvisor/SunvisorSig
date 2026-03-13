import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeNotification } from "@/lib/notification-presenter";
import {
  getUnreadNotifications,
  markPostNotificationsAsRead,
} from "@/lib/notification-service";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const notifications = await getUnreadNotifications(user.id);

  return NextResponse.json({
    notifications: notifications.map(serializeNotification),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string } | null;
  const postId = body?.postId?.trim();

  if (!postId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await markPostNotificationsAsRead(user.id, postId);

  return NextResponse.json({ ok: true });
}
