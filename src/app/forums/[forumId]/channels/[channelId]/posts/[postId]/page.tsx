import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { CommentComposer } from "@/components/comment-composer";
import { ForumShell } from "@/components/forum-shell";
import { NotificationReadTracker } from "@/components/notification-read-tracker";
import { PostCommentsPanel } from "@/components/post-comments-panel";
import { PrimaryLink, SectionCard } from "@/components/forum-ui";
import { PostBodyPanel, PostInfoPanel } from "@/components/post-details-panel";
import { initialCommentEditActionState, updateCommentAction } from "@/lib/comment-editing";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import {
  createCommentAction,
  initialCommentCreateActionState,
} from "@/lib/comment-creation";
import { deleteComment } from "@/lib/comment-deletion";
import {
  deleteCommentAttachment,
  deletePostAttachment,
} from "@/lib/attachment-editing";
import { deletePost } from "@/lib/post-deletion";
import { initialPostEditActionState, updatePostAction } from "@/lib/post-editing";
import {
  initialPostStatusActionState,
  updatePostStatusAction,
} from "@/lib/post-status-editing";
import { serializeComment, serializePostDetails } from "@/lib/activity-presenter";
import { getPost, isForumMember } from "@/lib/forum-data";
import { getForumHeroStyle, getForumPageStyle } from "@/lib/forum-theme";

type PostPageProps = Readonly<{
  params: Promise<{ forumId: string; channelId: string; postId: string }>;
}>;

export default async function PostPage({ params }: PostPageProps) {
  const { forumId, channelId, postId } = await params;
  const [post, currentUser] = await Promise.all([getPost(postId), getCurrentUser()]);

  if (
    !post ||
    post.channelId !== channelId ||
    post.channel.forumId !== forumId
  ) {
    notFound();
  }

  if (!currentUser) {
    redirect("/login" as Route);
  }

  if (!isForumMember(post.channel.forum, currentUser.id)) {
    notFound();
  }

  const isAdmin = isSystemAdmin(currentUser);

  return (
    <ForumShell
      eyebrow="Post"
      title={post.title}
      description={`${post.authorUser.displayName} による投稿`}
      themeStyle={getForumPageStyle(post.channel.forum)}
      heroStyle={getForumHeroStyle(post.channel.forum)}
      breadcrumbs={[
        { href: "/forums" as Route, label: "Forums" },
        { href: `/forums/${post.channel.forum.id}` as Route, label: post.channel.forum.name },
        {
          href: `/forums/${post.channel.forum.id}/channels/${post.channel.id}` as Route,
          label: post.channel.name,
        },
        { label: post.title },
      ]}
      actions={
        <PrimaryLink href={`/forums/${forumId}/channels/${channelId}` as Route}>
          チャンネルへ戻る
        </PrimaryLink>
      }
    >
      <NotificationReadTracker postId={postId} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <PostBodyPanel
            channelId={channelId}
            currentUserId={currentUser.id}
            deleteAttachmentAction={deletePostAttachment}
            deletePostAction={deletePost}
            forumId={forumId}
            isAdmin={isAdmin}
            post={serializePostDetails(post)}
            updatePostAction={updatePostAction}
            updatePostInitialState={initialPostEditActionState}
          />
          <SectionCard title="コメント">
            <PostCommentsPanel
              channelId={channelId}
              comments={post.comments.map(serializeComment)}
              currentUserId={currentUser.id}
              deleteCommentAction={deleteComment}
              deleteCommentAttachmentAction={deleteCommentAttachment}
              forumId={forumId}
              isAdmin={isAdmin}
              postId={postId}
              updateCommentAction={updateCommentAction}
              updateCommentInitialState={initialCommentEditActionState}
            />
            <CommentComposer
              action={createCommentAction}
              channelId={channelId}
              currentUserName={currentUser.displayName}
              forumId={forumId}
              initialState={initialCommentCreateActionState}
              postId={postId}
            />
          </SectionCard>
        </div>
        <PostInfoPanel
          channelId={channelId}
          currentUserId={currentUser.id}
          deleteAttachmentAction={deletePostAttachment}
          deletePostAction={deletePost}
          forumId={forumId}
          isAdmin={isAdmin}
          post={serializePostDetails(post)}
          updateStatusAction={updatePostStatusAction}
          updateStatusInitialState={initialPostStatusActionState}
        />
      </div>
    </ForumShell>
  );
}
