export type AppErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "MENTION_HANDLE_ALREADY_EXISTS"
  | "USER_ALREADY_EXISTS"
  | "INVITATION_ALREADY_EXISTS"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_EXPIRED"
  | "INVITATION_CANCELED"
  | "INVITATION_ACCEPTED"
  | "PASSWORD_MISMATCH"
  | "PASSWORD_TOO_SHORT";

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
