"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = Readonly<{
  children: React.ReactNode;
}>;

export function SubmitButton({ children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "保存中..." : children}
    </button>
  );
}
