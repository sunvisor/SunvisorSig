import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/app-error";
import { validateProfileInput } from "@/lib/profile-management";

describe("validateProfileInput", () => {
  it("normalizes valid profile input", () => {
    expect(
      validateProfileInput({
        displayName: "  Nakamura  ",
        mentionHandle: "  NaKa_muRa  ",
        nextPassword: "",
        nextPasswordConfirmation: "",
      }),
    ).toEqual({
      displayName: "Nakamura",
      mentionHandle: "naka_mura",
      nextPassword: "",
    });
  });

  it("rejects empty display names", () => {
    expect(() =>
      validateProfileInput({
        displayName: "   ",
        mentionHandle: "",
        nextPassword: "",
        nextPasswordConfirmation: "",
      }),
    ).toThrow(new AppError("INVALID_INPUT", "表示名を入力してください。"));
  });

  it("rejects invalid mention handles", () => {
    expect(() =>
      validateProfileInput({
        displayName: "User",
        mentionHandle: "bad handle!",
        nextPassword: "",
        nextPasswordConfirmation: "",
      }),
    ).toThrow(
      new AppError(
        "INVALID_INPUT",
        "メンション用ハンドルは英小文字、数字、ハイフン、アンダースコアのみ使えます。",
      ),
    );
  });

  it("rejects short passwords", () => {
    expect(() =>
      validateProfileInput({
        displayName: "User",
        mentionHandle: "",
        nextPassword: "short",
        nextPasswordConfirmation: "short",
      }),
    ).toThrow(new AppError("PASSWORD_TOO_SHORT", "パスワードは8文字以上で入力してください。"));
  });

  it("rejects mismatched password confirmation", () => {
    expect(() =>
      validateProfileInput({
        displayName: "User",
        mentionHandle: "",
        nextPassword: "password123",
        nextPasswordConfirmation: "password124",
      }),
    ).toThrow(new AppError("PASSWORD_MISMATCH", "パスワード確認が一致しません。"));
  });
});
