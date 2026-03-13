"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-classes";
import { SubmitButton } from "@/components/submit-button";

type CommentComposerProps = Readonly<{
  forumId: string;
  channelId: string;
  postId: string;
  action: (formData: FormData) => void | Promise<void>;
  currentUserName: string;
}>;

export function CommentComposer({
  forumId,
  channelId,
  postId,
  action,
  currentUserName,
}: CommentComposerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-6">
      {isOpen ? (
        <form action={action} className={ui.form.panel}>
          <input name="forumId" type="hidden" value={forumId} />
          <input name="channelId" type="hidden" value={channelId} />
          <input name="postId" type="hidden" value={postId} />
          <p className={ui.text.body}>コメント投稿者: {currentUserName}</p>
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="commentBodyMarkdown">
              コメント本文
            </label>
            <textarea
              className={`${ui.form.textarea} min-h-44`}
              id="commentBodyMarkdown"
              name="bodyMarkdown"
              placeholder={
                "Markdown でコメントできます。\n\n添付は [補足資料](attachment:file.pdf) の形式で参照できます。"
              }
              required
            />
          </div>
          <div className={ui.form.group}>
            <label className={ui.text.label} htmlFor="commentAttachments">
              添付ファイル
            </label>
            <input
              className={ui.form.fileInput}
              id="commentAttachments"
              multiple
              name="attachments"
              type="file"
            />
          </div>
          <div className={ui.form.actions}>
            <SubmitButton>コメントする</SubmitButton>
            <button
              className={ui.button.secondary}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              閉じる
            </button>
          </div>
        </form>
      ) : (
        <button
          className={ui.button.primary}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          コメントする
        </button>
      )}
    </div>
  );
}
