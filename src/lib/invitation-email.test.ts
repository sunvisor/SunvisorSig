import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const originalEnv = { ...process.env };

describe("sendInvitationEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSendMail.mockReset();
    mockCreateTransport.mockClear();
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;
    process.env.APP_URL = "http://localhost:3000/";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to log delivery when SMTP is not configured", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendInvitationEmail } = await import("@/lib/invitation-email");

    const result = await sendInvitationEmail({
      forumName: "Acme Forum",
      recipientEmail: "user@example.com",
      token: "token-123",
      expiresAt: new Date("2026-03-20T00:00:00Z"),
    });

    expect(result).toEqual({
      deliveryMode: "log",
      activationUrl: "http://localhost:3000/activate?token=token-123",
    });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateTransport).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("uses nodemailer when SMTP is configured", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASSWORD = "secret";
    process.env.SMTP_FROM = "noreply@example.com";

    const { sendInvitationEmail } = await import("@/lib/invitation-email");

    const result = await sendInvitationEmail({
      forumName: "Acme Forum",
      recipientEmail: "user@example.com",
      token: "token-456",
      expiresAt: new Date("2026-03-20T00:00:00Z"),
    });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: "mailer",
        pass: "secret",
      },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "【Acme Forum】フォーラム招待",
      text: [
        "Acme Forum に招待されました。",
        "",
        "以下のリンクからアカウントを有効化してください。",
        "http://localhost:3000/activate?token=token-456",
        "",
        "有効期限: 2026-03-20T00:00:00.000Z",
      ].join("\n"),
    });
    expect(result).toEqual({
      deliveryMode: "smtp",
      activationUrl: "http://localhost:3000/activate?token=token-456",
    });
  });
});
