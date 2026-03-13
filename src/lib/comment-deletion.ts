import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { publishChannelActivity, publishPostActivity } from "@/lib/notification-events";
import { deleteCommentById } from "@/lib/deletion-service";

export async function deleteComment(formData: FormData) {
  "use server";

  const forumId = String(formData.get("forumId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");

  if (!forumId || !channelId || !postId || !commentId) {
    throw new Error("削除対象の情報が不足しています。");
  }

  const currentUser = await requireCurrentUser();

  await deleteCommentById({
    forumId,
    channelId,
    postId,
    commentId,
    actingUserId: currentUser.id,
  });

  publishPostActivity(postId);
  publishChannelActivity(channelId);

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}
