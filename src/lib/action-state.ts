import type { AppErrorCode } from "@/lib/app-error";

export type FormActionState = {
  ok: boolean;
  code?: AppErrorCode;
  message: string;
};

export const initialFormActionState: FormActionState = {
  ok: false,
  message: "",
};
