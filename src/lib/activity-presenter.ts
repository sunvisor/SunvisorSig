import type { Route } from "next";
import { formatDateTime } from "@/lib/date-time";

export type CommentListItem = {
  id: string;
  type: "USER" | "STATUS_CHANGE";
  authorUserId: string;
  authorDisplayName: string;
  bodyMarkdown: string;
  createdAtLabel: string;
  attachments: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

export type ChannelPostListItem = {
  id: string;
  href: Route;
  title: string;
  bodyMarkdown: string;
  status: string | null;
  authorDisplayName: string;
  commentCount: number;
  attachmentCount: number;
  updatedAtLabel: string;
};

export type PostDetailsItem = {
  id: string;
  title: string;
  bodyMarkdown: string;
  status: string | null;
  authorUserId: string;
  authorDisplayName: string;
  attachmentCount: number;
  commentCount: number;
  createdAtLabel: string;
  updatedAtLabel: string;
  attachments: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

export function serializeComment(comment: {
  id: string;
  type: "USER" | "STATUS_CHANGE";
  authorUserId: string;
  bodyMarkdown: string;
  createdAt: Date;
  authorUser: {
    displayName: string;
  };
  attachments: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}): CommentListItem {
  return {
    id: comment.id,
    type: comment.type,
    authorUserId: comment.authorUserId,
    authorDisplayName: comment.authorUser.displayName,
    bodyMarkdown: comment.bodyMarkdown,
    createdAtLabel: formatDateTime(comment.createdAt),
    attachments: comment.attachments,
  };
}

export function serializeChannelPost(params: {
  forumId: string;
  channelId: string;
  post: {
    id: string;
    title: string;
    bodyMarkdown: string;
    status: string | null;
    updatedAt: Date;
    authorUser: {
      displayName: string;
    };
    attachments: Array<unknown>;
    comments: Array<unknown>;
  };
}): ChannelPostListItem {
  const { forumId, channelId, post } = params;

  return {
    id: post.id,
    href: `/forums/${forumId}/channels/${channelId}/posts/${post.id}` as Route,
    title: post.title,
    bodyMarkdown: post.bodyMarkdown,
    status: post.status,
    authorDisplayName: post.authorUser.displayName,
    commentCount: post.comments.length,
    attachmentCount: post.attachments.length,
    updatedAtLabel: formatDateTime(post.updatedAt),
  };
}

export function serializePostDetails(post: {
  id: string;
  title: string;
  bodyMarkdown: string;
  status: string | null;
  authorUserId: string;
  createdAt: Date;
  updatedAt: Date;
  authorUser: {
    displayName: string;
  };
  attachments: Array<{
    id: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  comments: Array<unknown>;
}): PostDetailsItem {
  return {
    id: post.id,
    title: post.title,
    bodyMarkdown: post.bodyMarkdown,
    status: post.status,
    authorUserId: post.authorUserId,
    authorDisplayName: post.authorUser.displayName,
    attachmentCount: post.attachments.length,
    commentCount: post.comments.length,
    createdAtLabel: formatDateTime(post.createdAt),
    updatedAtLabel: formatDateTime(post.updatedAt),
    attachments: post.attachments,
  };
}
