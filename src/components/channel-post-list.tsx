"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/forum-ui";
import { PostStatusBadge } from "@/components/post-status-badge";
import type { ChannelPostListItem } from "@/lib/activity-presenter";
import { ui } from "@/lib/ui-classes";

type ChannelPostListProps = Readonly<{
  channelId: string;
  query: string;
  selectedStatus: string;
  posts: ChannelPostListItem[];
}>;

export function ChannelPostList({
  channelId,
  query,
  selectedStatus,
  posts,
}: ChannelPostListProps) {
  const [items, setItems] = useState(posts);

  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const refreshPosts = useCallback(async () => {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (selectedStatus) {
      params.set("status", selectedStatus);
    }

    const search = params.toString();
    const response = await fetch(
      `/api/channels/${channelId}/posts${search ? `?${search}` : ""}`,
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      posts: ChannelPostListItem[];
    };

    setItems(data.posts);
  }, [channelId, query, selectedStatus]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/channels/${channelId}/stream`);
    const handleRefresh = () => {
      void refreshPosts();
    };

    eventSource.addEventListener("refresh", handleRefresh);

    return () => {
      eventSource.removeEventListener("refresh", handleRefresh);
      eventSource.close();
    };
  }, [channelId, refreshPosts]);

  if (items.length === 0) {
    return (
      <EmptyState
        title={query || selectedStatus ? "一致する投稿がありません" : "投稿がありません"}
        description={
          query || selectedStatus
            ? "検索条件を変えるか、キーワードをクリアしてください。"
            : "最初の投稿を作成すると、ここにスレッド一覧が表示されます。"
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((post) => (
        <Link
          key={post.id}
          className={`${ui.surface.listItem} p-5`}
          href={post.href}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="theme-text font-medium">{post.title}</p>
            {post.status ? <PostStatusBadge status={post.status} /> : null}
          </div>
          <p className={`mt-2 ${ui.text.body}`}>{post.bodyMarkdown}</p>
          <div className={`mt-4 flex flex-wrap gap-4 ${ui.text.meta}`}>
            <span>Author {post.authorDisplayName}</span>
            <span>Comments {post.commentCount}</span>
            <span>Files {post.attachmentCount}</span>
          </div>
          <p className={`mt-2 ${ui.text.subtleMeta}`}>
            Updated {post.updatedAtLabel}
          </p>
        </Link>
      ))}
    </div>
  );
}
