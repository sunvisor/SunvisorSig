import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const mockFetch = vi.fn();

describe("sendInvitationEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    process.env = { ...originalEnv };
    delete process.env.EMAIL_API_URL;
    delete process.env.EMAIL_API_TOKEN;
    delete process.env.EMAIL_FROM;
    process.env.APP_URL = "http://localhost:3000/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("falls back to log delivery when email API is not configured", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { buildInvitationEmail, sendInvitationEmail } = await import("@/lib/invitation-email");

    expect(
      buildInvitationEmail({
        forumName: "Acme Forum",
        recipientEmail: "user@example.com",
        token: "token-123",
        expiresAt: new Date("2026-03-20T00:00:00Z"),
      }),
    ).toEqual({
      subject: "【Acme Forum】フォーラム招待",
      text: [
        "Acme Forum に招待されました。",
        "",
        "以下のリンクからアカウントを有効化してください。",
        "http://localhost:3000/activate?token=token-123",
        "",
        "有効期限: 2026-03-20T00:00:00.000Z",
      ].join("\n"),
      activationUrl: "http://localhost:3000/activate?token=token-123",
      recipientEmail: "user@example.com",
    });

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
    expect(mockFetch).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("uses an HTTP email API when configured", async () => {
    process.env.EMAIL_API_URL = "https://email.example.com/send";
    process.env.EMAIL_API_TOKEN = "secret-token";
    process.env.EMAIL_FROM = "noreply@example.com";
    mockFetch.mockResolvedValue(new Response(null, { status: 202 }));

    const { sendInvitationEmail } = await import("@/lib/invitation-email");

    const result = await sendInvitationEmail({
      forumName: "Acme Forum",
      recipientEmail: "user@example.com",
      token: "token-456",
      expiresAt: new Date("2026-03-20T00:00:00Z"),
    });

    expect(mockFetch).toHaveBeenCalledWith("https://email.example.com/send", {
      method: "POST",
      headers: {
        Authorization: "Bearer secret-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });
    expect(result).toEqual({
      deliveryMode: "email-api",
      activationUrl: "http://localhost:3000/activate?token=token-456",
    });
  });

  it("fails when the email API rejects the request", async () => {
    process.env.EMAIL_API_URL = "https://email.example.com/send";
    process.env.EMAIL_API_TOKEN = "secret-token";
    process.env.EMAIL_FROM = "noreply@example.com";
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

    const { sendInvitationEmail } = await import("@/lib/invitation-email");

    await expect(
      sendInvitationEmail({
        forumName: "Acme Forum",
        recipientEmail: "user@example.com",
        token: "token-789",
        expiresAt: new Date("2026-03-20T00:00:00Z"),
      }),
    ).rejects.toThrow("Email API request failed with status 500.");
  });
});
