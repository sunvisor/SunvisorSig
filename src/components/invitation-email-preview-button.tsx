"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui-classes";

type InvitationEmailPreviewButtonProps = Readonly<{
  recipientEmail: string;
  subject: string;
  text: string;
}>;

export function InvitationEmailPreviewButton({
  recipientEmail,
  subject,
  text,
}: InvitationEmailPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 16,
    maxHeight: 0,
    placement: "bottom" as "top" | "bottom",
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const gap = 12;
      const width = Math.min(544, window.innerWidth - 32);
      const availableBelow = viewportHeight - rect.bottom - 16;
      const availableAbove = rect.top - 16;
      const maxHeight = Math.max(240, Math.max(availableBelow, availableAbove));
      const prefersAbove = availableBelow < 320 && availableAbove > availableBelow;

      setPosition({
        top: prefersAbove ? rect.top - gap : rect.bottom + gap,
        left: Math.min(Math.max(16, rect.left), window.innerWidth - width - 16),
        maxHeight,
        placement: prefersAbove ? "top" : "bottom",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div>
      <button
        className={ui.button.secondary}
        onClick={() => setOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        メール文面を表示する
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-120"
              onClick={() => setOpen(false)}
            >
              <div
                className="theme-card fixed z-121 grid w-[min(34rem,calc(100vw-2rem))] gap-4 rounded-3xl border p-5 shadow-2xl shadow-slate-900/10"
                onClick={(event) => event.stopPropagation()}
                style={{
                  top: position.top,
                  left: position.left,
                  maxHeight: `${position.maxHeight}px`,
                  transform:
                    position.placement === "top" ? "translateY(-100%)" : "translateY(0)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <p className={ui.text.meta}>To</p>
                    <p className="theme-text text-sm font-medium">{recipientEmail}</p>
                  </div>
                  <button
                    aria-label="メール文面を閉じる"
                    className={ui.button.iconSecondary}
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-2">
                  <p className={ui.text.meta}>Subject</p>
                  <p className="theme-text text-sm font-medium">{subject}</p>
                </div>
                <div className="grid gap-2">
                  <p className={ui.text.meta}>Body</p>
                  <pre className="theme-text-muted overflow-y-auto whitespace-pre-wrap wrap-break-word text-sm leading-7">
                    {text}
                  </pre>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
