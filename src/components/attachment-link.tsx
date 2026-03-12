"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type AttachmentLinkProps = Readonly<{
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
  compact?: boolean;
}>;

function formatBytes(sizeBytes?: number) {
  if (typeof sizeBytes !== "number") {
    return null;
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

export function AttachmentLink({
  filename,
  storagePath,
  mimeType,
  sizeBytes,
  compact = false,
}: AttachmentLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formattedSize = formatBytes(sizeBytes);
  const previewable = isPreviewable(mimeType);

  if (!previewable) {
    if (compact) {
      return (
        <a
          className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900 no-underline transition hover:border-sky-300 hover:bg-sky-100"
          download
          href={storagePath}
          title={mimeType}
        >
          {filename}
        </a>
      );
    }

    return (
      <a
        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm no-underline transition hover:border-slate-300 hover:bg-white"
        download
        href={storagePath}
        title={mimeType}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-950">{filename}</span>
          <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-slate-500">
            {mimeType}
          </span>
        </span>
        <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500">
          {formattedSize ?? "Download"}
        </span>
      </a>
    );
  }

  return (
    <>
      <button
        className={
          compact
            ? "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
            : "flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-white"
        }
        onClick={() => setIsOpen(true)}
        title={mimeType}
        type="button"
      >
        {compact ? (
          filename
        ) : (
          <>
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-950">{filename}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-slate-500">
                {mimeType}
              </span>
            </span>
            <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500">
              {formattedSize ?? "Preview"}
            </span>
          </>
        )}
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-6"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-white">{filename}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {mimeType}
                      {formattedSize ? ` / ${formattedSize}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-100"
                      download
                      href={storagePath}
                    >
                      ダウンロード
                    </a>
                    <button
                      className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-400 hover:bg-slate-800"
                      onClick={() => setIsOpen(false)}
                      type="button"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
                <div className="flex max-h-[calc(90vh-5rem)] items-center justify-center overflow-auto bg-slate-950 p-6">
                  {mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={filename}
                      className="max-h-full max-w-full rounded-2xl object-contain"
                      src={storagePath}
                    />
                  ) : (
                    <video
                      className="max-h-full max-w-full rounded-2xl"
                      controls
                      preload="metadata"
                      src={storagePath}
                    />
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
