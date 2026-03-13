import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { publishChannelActivity } from "@/lib/notification-events";
import { deletePostById } from "@/lib/deletion-service";

export async function deletePost(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");

  if (!forumId || !channelId || !postId) {
    throw new Error("削除対象の情報が不足しています。");
  }

  const currentUser = await requireCurrentUser();

  await deletePostById({
    forumId,
    channelId,
    postId,
    actingUserId: currentUser.id,
  });

  publishChannelActivity(channelId);

  revalidatePath("/forums");
  revalidatePath(`/forums/${forumId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  redirect(`/forums/${forumId}/channels/${channelId}` as Route);
}
