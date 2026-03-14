import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/app-url";

export function getActivationUrl(token: string) {
  return `${getAppUrl()}/activate?token=${token}`;
}

export function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM,
  );
}

export function buildInvitationEmail(input: {
  forumName: string;
  recipientEmail: string;
  token: string;
  expiresAt: Date;
}) {
  const activationUrl = getActivationUrl(input.token);
  const subject = `【${input.forumName}】フォーラム招待`;
  const text = [
    `${input.forumName} に招待されました。`,
    "",
    "以下のリンクからアカウントを有効化してください。",
    activationUrl,
    "",
    `有効期限: ${input.expiresAt.toISOString()}`,
  ].join("\n");

  return {
    subject,
    text,
    activationUrl,
    recipientEmail: input.recipientEmail,
  };
}

export async function sendInvitationEmail(input: {
  forumName: string;
  recipientEmail: string;
  token: string;
  expiresAt: Date;
}) {
  const email = buildInvitationEmail(input);

  if (!hasSmtpConfig()) {
    console.log(
      [
        "[invitation-email]",
        `to=${input.recipientEmail}`,
        `forum=${input.forumName}`,
        `expiresAt=${input.expiresAt.toISOString()}`,
        `activationUrl=${email.activationUrl}`,
      ].join(" "),
    );

    return {
      deliveryMode: "log" as const,
      activationUrl: email.activationUrl,
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.recipientEmail,
    subject: email.subject,
    text: email.text,
  });

  return {
    deliveryMode: "smtp" as const,
    activationUrl: email.activationUrl,
  };
}
