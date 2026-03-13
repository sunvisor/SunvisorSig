import nodemailer from "nodemailer";

function getAppUrl() {
  return (process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000");
}

function getActivationUrl(token: string) {
  return `${getAppUrl()}/activate?token=${token}`;
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM,
  );
}

export async function sendInvitationEmail(input: {
  forumName: string;
  recipientEmail: string;
  token: string;
  expiresAt: Date;
}) {
  const activationUrl = getActivationUrl(input.token);

  if (!hasSmtpConfig()) {
    console.log(
      [
        "[invitation-email]",
        `to=${input.recipientEmail}`,
        `forum=${input.forumName}`,
        `expiresAt=${input.expiresAt.toISOString()}`,
        `activationUrl=${activationUrl}`,
      ].join(" "),
    );

    return {
      deliveryMode: "log" as const,
      activationUrl,
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
    subject: `【${input.forumName}】フォーラム招待`,
    text: [
      `${input.forumName} に招待されました。`,
      "",
      "以下のリンクからアカウントを有効化してください。",
      activationUrl,
      "",
      `有効期限: ${input.expiresAt.toISOString()}`,
    ].join("\n"),
  });

  return {
    deliveryMode: "smtp" as const,
    activationUrl,
  };
}
