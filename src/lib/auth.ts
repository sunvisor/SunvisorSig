import { createHmac, timingSafeEqual } from "node:crypto";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppError, isAppError, type AppErrorCode } from "@/lib/app-error";
import { verifyPassword } from "@/lib/password";

const SESSION_COOKIE_NAME = "sunvisor_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

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

function signValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

function encodeSession(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(data);

  return `${data}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [data, signature] = token.split(".");

  if (!data || !signature) {
    return null;
  }

  const expectedSignature = signValue(data);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;

    if (!payload.userId || !payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession({ userId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
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

  const payload = decodeSession(sessionCookie);

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

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  "use server";

  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      throw new AppError("INVALID_INPUT", "メールアドレスとパスワードを入力してください。");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash || user.status !== "ACTIVE") {
      throw new AppError("INVITATION_NOT_FOUND", "メールアドレスまたはパスワードが正しくありません。");
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw new AppError("INVITATION_NOT_FOUND", "メールアドレスまたはパスワードが正しくありません。");
    }

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
