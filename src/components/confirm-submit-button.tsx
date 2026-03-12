"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmSubmitButtonProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  description?: string;
  message: string;
}>;

export function ConfirmSubmitButton({
  children,
  className,
  description,
  message,
}: ConfirmSubmitButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={className}
        onClick={() => setIsOpen(true)}
        ref={buttonRef}
        type="button"
      >
        {children}
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-6"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-slate-800 px-6 py-5">
                  <p className="text-lg font-semibold text-white">{message}</p>
                  {description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-5">
                  <button
                    className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-400 hover:bg-slate-800"
                    onClick={() => setIsOpen(false)}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className="inline-flex items-center rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400"
                    onClick={() => {
                      setIsOpen(false);
                      buttonRef.current?.form?.requestSubmit();
                    }}
                    type="button"
                  >
                    削除する
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
