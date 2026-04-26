import { getAppUrl } from "@/lib/app-url";

type EmailApiPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export function getActivationUrl(token: string) {
  return `${getAppUrl()}/activate?token=${token}`;
}

export function hasEmailApiConfig() {
  return Boolean(
    process.env.EMAIL_API_URL &&
      process.env.EMAIL_API_TOKEN &&
      process.env.EMAIL_FROM,
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

async function sendEmailApiRequest(payload: EmailApiPayload) {
  const response = await fetch(process.env.EMAIL_API_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Email API request failed with status ${response.status}.`);
  }
}

export async function sendInvitationEmail(input: {
  forumName: string;
  recipientEmail: string;
  token: string;
  expiresAt: Date;
}) {
  const email = buildInvitationEmail(input);

  if (!hasEmailApiConfig()) {
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

  await sendEmailApiRequest({
    from: process.env.EMAIL_FROM!,
    to: input.recipientEmail,
    subject: email.subject,
    text: email.text,
  });

  return {
    deliveryMode: "email-api" as const,
    activationUrl: email.activationUrl,
  };
}
