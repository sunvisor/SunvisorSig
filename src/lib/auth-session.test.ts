import { describe, expect, it } from "vitest";
import {
  decodeSessionToken,
  encodeSessionToken,
  signSessionValue,
} from "@/lib/auth-session";

describe("auth session helpers", () => {
  const secret = "test-secret";

  it("encodes and decodes a valid session token", () => {
    const token = encodeSessionToken(
      {
        userId: "user-1",
        expiresAt: 1_800_000_000_000,
      },
      secret,
    );

    expect(decodeSessionToken(token, secret)).toEqual({
      userId: "user-1",
      expiresAt: 1_800_000_000_000,
    });
  });

  it("rejects tokens with a tampered signature", () => {
    const token = encodeSessionToken(
      {
        userId: "user-1",
        expiresAt: 1_800_000_000_000,
      },
      secret,
    );
    const [data] = token.split(".");
    const tamperedToken = `${data}.${signSessionValue(data!, "wrong-secret")}`;

    expect(decodeSessionToken(tamperedToken, secret)).toBeNull();
  });

  it("rejects tokens with malformed payloads", () => {
    expect(decodeSessionToken("broken", secret)).toBeNull();
    expect(decodeSessionToken("bm90LWpzb24.signature", secret)).toBeNull();
  });

  it("rejects tokens without required payload fields", () => {
    const data = Buffer.from(JSON.stringify({ userId: "" })).toString("base64url");
    const signature = signSessionValue(data, secret);

    expect(decodeSessionToken(`${data}.${signature}`, secret)).toBeNull();
  });
});
