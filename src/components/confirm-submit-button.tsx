"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { ui } from "@/lib/ui-classes";

type ConfirmSubmitButtonProps = Readonly<{
  children?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  description?: string;
  icon?: "trash" | "x";
  message: string;
  onConfirm?: () => void;
}>;

export function ConfirmSubmitButton({
  children,
  ariaLabel,
  className,
  description,
  icon,
  message,
  onConfirm,
}: ConfirmSubmitButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={className}
        onClick={() => setIsOpen(true)}
        ref={buttonRef}
        type="button"
      >
        {icon === "trash" ? <Trash2 aria-hidden="true" size={16} /> : null}
        {icon === "x" ? <X aria-hidden="true" size={16} /> : null}
        {children}
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className={ui.modal.overlay}
              onClick={() => setIsOpen(false)}
            >
              <div
                className={`w-full max-w-lg ${ui.modal.shell}`}
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
                <div className={ui.modal.footer}>
                  <button
                    className={ui.button.modalGhost}
                    onClick={() => setIsOpen(false)}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className={ui.button.modalDanger}
                    onClick={() => {
                      setIsOpen(false);
                      onConfirm?.();
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
