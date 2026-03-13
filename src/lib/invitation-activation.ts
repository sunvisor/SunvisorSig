import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function getActivationErrorMessage(invitation: {
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELED";
  expiresAt: Date;
}) {
  if (invitation.status === "ACCEPTED") {
    return "この招待はすでに利用されています。";
  }

  if (invitation.status === "CANCELED") {
    return "この招待は取り消されています。";
  }

  if (invitation.status === "EXPIRED" || invitation.expiresAt <= new Date()) {
    return "この招待は有効期限切れです。";
  }

  return null;
}

export async function activateInvitation(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

  if (!token || !displayName || !password || !passwordConfirmation) {
    throw new Error("必須項目が不足しています。");
  }

  if (password !== passwordConfirmation) {
    throw new Error("パスワードが一致しません。");
  }

  if (password.length < 8) {
    throw new Error("パスワードは 8 文字以上で入力してください。");
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      forum: true,
    },
  });

  if (!invitation) {
    throw new Error("招待が見つかりません。");
  }

  const activationErrorMessage = getActivationErrorMessage(invitation);

  if (activationErrorMessage) {
    if (invitation.status === "PENDING" && invitation.expiresAt <= new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }

    throw new Error(activationErrorMessage);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    throw new Error("このメールアドレスのユーザーはすでに存在します。");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        displayName,
        email: invitation.email,
        passwordHash: hashPassword(password),
        status: "ACTIVE",
      },
    });

    await tx.forumMember.create({
      data: {
        forumId: invitation.forumId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  });

  revalidatePath("/forums");
  revalidatePath(`/forums/${invitation.forumId}`);
  revalidatePath(`/forums/${invitation.forumId}/settings`);
  redirect(`/activate/success?forumId=${invitation.forumId}`);
}

export async function getInvitationForActivation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      forum: true,
    },
  });

  if (!invitation) {
    return null;
  }

  const activationErrorMessage = getActivationErrorMessage(invitation);

  return {
    ...invitation,
    activationErrorMessage,
  };
}
