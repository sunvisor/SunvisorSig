import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { AppError, isAppError } from "@/lib/app-error";
import { requireCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const mentionHandlePattern = /^[a-z0-9_-]+$/;

export const initialProfileActionState = initialFormActionState;

export function validateProfileInput(input: {
  displayName: string;
  mentionHandle: string;
  nextPassword: string;
  nextPasswordConfirmation: string;
}) {
  const displayName = input.displayName.trim();
  const rawMentionHandle = input.mentionHandle.trim().toLowerCase();
  const nextPassword = input.nextPassword;
  const nextPasswordConfirmation = input.nextPasswordConfirmation;

  if (!displayName) {
    throw new AppError("INVALID_INPUT", "表示名を入力してください。");
  }

  if (rawMentionHandle && !mentionHandlePattern.test(rawMentionHandle)) {
    throw new AppError(
      "INVALID_INPUT",
      "メンション用ハンドルは英小文字、数字、ハイフン、アンダースコアのみ使えます。",
    );
  }

  if (nextPassword || nextPasswordConfirmation) {
    if (nextPassword.length < 8) {
      throw new AppError("PASSWORD_TOO_SHORT", "パスワードは8文字以上で入力してください。");
    }

    if (nextPassword !== nextPasswordConfirmation) {
      throw new AppError("PASSWORD_MISMATCH", "パスワード確認が一致しません。");
    }
  }

  return {
    displayName,
    mentionHandle: rawMentionHandle || null,
    nextPassword,
  };
}

export async function updateProfileRecord(input: {
  userId: string;
  displayName: string;
  mentionHandle: string;
  nextPassword: string;
  nextPasswordConfirmation: string;
}) {
  const { displayName, mentionHandle, nextPassword } = validateProfileInput(input);

  if (mentionHandle) {
    const existingUser = await prisma.user.findFirst({
      where: {
        mentionHandle,
        id: {
          not: input.userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new AppError(
        "MENTION_HANDLE_ALREADY_EXISTS",
        "そのメンション用ハンドルはすでに使われています。",
      );
    }
  }

  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      displayName,
      mentionHandle,
      ...(nextPassword
        ? {
            passwordHash: await hashPassword(nextPassword),
          }
        : {}),
    },
  });
}

export async function updateProfile(formData: FormData) {
  "use server";

  const currentUser = await requireCurrentUser();

  await updateProfileRecord({
    userId: currentUser.id,
    displayName: String(formData.get("displayName") ?? ""),
    mentionHandle: String(formData.get("mentionHandle") ?? ""),
    nextPassword: String(formData.get("nextPassword") ?? ""),
    nextPasswordConfirmation: String(formData.get("nextPasswordConfirmation") ?? ""),
  });

  revalidatePath("/profile");
  revalidatePath("/forums");
}

export async function updateProfileAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await updateProfile(formData);

    return {
      ok: true,
      message: "プロフィールを更新しました。",
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}
