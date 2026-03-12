"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

type MemberOption = {
  id: string;
  role: string;
  userId: string;
  displayName: string;
};

type CommentComposerProps = Readonly<{
  forumId: string;
  channelId: string;
  postId: string;
  members: MemberOption[];
  action: (formData: FormData) => void | Promise<void>;
}>;

export function CommentComposer({
  forumId,
  channelId,
  postId,
  members,
  action,
}: CommentComposerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-6">
      {isOpen ? (
        <form
          action={action}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <input name="forumId" type="hidden" value={forumId} />
          <input name="channelId" type="hidden" value={channelId} />
          <input name="postId" type="hidden" value={postId} />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="commentAuthorUserId">
              投稿者
            </label>
            <select
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              defaultValue={members[0]?.userId ?? ""}
              id="commentAuthorUserId"
              name="authorUserId"
              required
            >
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.displayName} ({member.role})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="commentBodyMarkdown">
              コメント本文
            </label>
            <textarea
              className="min-h-44 rounded-3xl border border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-500"
              id="commentBodyMarkdown"
              name="bodyMarkdown"
              placeholder={
                "Markdown でコメントできます。\n\n添付は [補足資料](attachment:file.pdf) の形式で参照できます。"
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="commentAttachments">
              添付ファイル
            </label>
            <input
              className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              id="commentAttachments"
              multiple
              name="attachments"
              type="file"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>コメントする</SubmitButton>
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              閉じる
            </button>
          </div>
        </form>
      ) : (
        <button
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          コメントする
        </button>
      )}
    </div>
  );
}
