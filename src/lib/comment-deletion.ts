import { revalidatePath } from "next/cache";
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

  await deleteCommentById({ forumId, channelId, postId, commentId });

  revalidatePath(`/forums/${forumId}/channels/${channelId}`);
  revalidatePath(`/forums/${forumId}/channels/${channelId}/posts/${postId}`);
}
