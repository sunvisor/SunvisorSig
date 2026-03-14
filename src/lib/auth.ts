import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionToken, encodeSessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { AppError, isAppError, type AppErrorCode } from "@/lib/app-error";
import { verifyPassword } from "@/lib/password";
import { assertRateLimit } from "@/lib/rate-limit";

const SESSION_COOKIE_NAME = "sunvisor_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type LoginActionState = {
  ok: boolean;
  code?: AppErrorCode;
  message: string;
};

export const initialLoginActionState: LoginActionState = {
  ok: false,
  message: "",
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return secret;
}

async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  cookieStore.set(
    SESSION_COOKIE_NAME,
    encodeSessionToken({ userId, expiresAt }, getAuthSecret()),
    {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const payload = decodeSessionToken(sessionCookie, getAuthSecret());

  if (!payload || payload.expiresAt <= Date.now()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      mentionHandle: true,
      systemRole: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login" as Route);
  }

  return user;
}

export function isSystemAdmin(user: { systemRole: string }) {
  return user.systemRole === "ADMIN";
}

export async function requireSystemAdmin() {
  const user = await requireCurrentUser();

  if (!isSystemAdmin(user)) {
    throw new AppError("FORBIDDEN", "全体管理者のみ操作できます。");
  }

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new AppError("INVALID_INPUT", "メールアドレスとパスワードを入力してください。");
  }

  assertRateLimit({
    key: `login:${normalizedEmail}`,
    limit: 5,
    windowMs: 1000 * 60 * 10,
    message: "ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。",
  });

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    throw new AppError("INVITATION_NOT_FOUND", "メールアドレスまたはパスワードが正しくありません。");
  }

  if (!verifyPassword(password, user.passwordHash)) {
    throw new AppError("INVITATION_NOT_FOUND", "メールアドレスまたはパスワードが正しくありません。");
  }

  return user;
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  "use server";

  try {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const user = await authenticateUser(email, password);

    await setSessionCookie(user.id);
  } catch (error) {
    return {
      ok: false,
      code: isAppError(error) ? error.code : undefined,
      message: error instanceof Error ? error.message : "ログインに失敗しました。",
    };
  }

  redirect("/forums" as Route);
}

export async function logoutAction() {
  "use server";

  await clearSession();
  redirect("/login" as Route);
}
