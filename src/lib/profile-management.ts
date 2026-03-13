import { revalidatePath } from "next/cache";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { AppError, isAppError } from "@/lib/app-error";
import { requireCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const mentionHandlePattern = /^[a-z0-9_-]+$/;

export const initialProfileActionState = initialFormActionState;

export async function updateProfile(formData: FormData) {
  "use server";

  const currentUser = await requireCurrentUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const rawMentionHandle = String(formData.get("mentionHandle") ?? "").trim().toLowerCase();
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const nextPasswordConfirmation = String(
    formData.get("nextPasswordConfirmation") ?? "",
  );

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

  const mentionHandle = rawMentionHandle || null;

  if (mentionHandle) {
    const existingUser = await prisma.user.findFirst({
      where: {
        mentionHandle,
        id: {
          not: currentUser.id,
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
      id: currentUser.id,
    },
    data: {
      displayName,
      mentionHandle,
      ...(nextPassword
        ? {
            passwordHash: hashPassword(nextPassword),
          }
        : {}),
    },
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
