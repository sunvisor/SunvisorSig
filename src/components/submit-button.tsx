"use client";

import { useFormStatus } from "react-dom";
import { ui } from "@/lib/ui-classes";

type SubmitButtonProps = Readonly<{
  children: React.ReactNode;
}>;

export function SubmitButton({ children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${ui.button.primary} ${ui.button.disabled}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "保存中..." : children}
    </button>
  );
}
