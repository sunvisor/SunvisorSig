import { describe, expect, it } from "vitest";
import {
  decodeSessionToken,
  encodeSessionToken,
  signSessionValue,
} from "@/lib/auth-session";

describe("auth session helpers", () => {
  const secret = "test-secret";

  it("encodes and decodes a valid session token", async () => {
    const token = await encodeSessionToken(
      {
        userId: "user-1",
        expiresAt: 1_800_000_000_000,
      },
      secret,
    );

    await expect(decodeSessionToken(token, secret)).resolves.toEqual({
      userId: "user-1",
      expiresAt: 1_800_000_000_000,
    });
  });

  it("rejects tokens with a tampered signature", async () => {
    const token = await encodeSessionToken(
      {
        userId: "user-1",
        expiresAt: 1_800_000_000_000,
      },
      secret,
    );
    const [data] = token.split(".");
    const tamperedToken = `${data}.${await signSessionValue(data!, "wrong-secret")}`;

    await expect(decodeSessionToken(tamperedToken, secret)).resolves.toBeNull();
  });

  it("rejects tokens with malformed payloads", async () => {
    await expect(decodeSessionToken("broken", secret)).resolves.toBeNull();
    await expect(decodeSessionToken("bm90LWpzb24.signature", secret)).resolves.toBeNull();
  });

  it("rejects tokens without required payload fields", async () => {
    const data = await encodeSessionToken({ userId: "", expiresAt: 1 }, secret);

    await expect(decodeSessionToken(data, secret)).resolves.toBeNull();
  });
});
