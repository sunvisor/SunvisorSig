import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password helpers", () => {
  it("verifies the original password", () => {
    const hash = hashPassword("password123");

    expect(verifyPassword("password123", hash)).toBe(true);
  });

  it("rejects a different password", () => {
    const hash = hashPassword("password123");

    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("password123", "broken")).toBe(false);
  });
});
