import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitStore, assertRateLimit } from "@/lib/rate-limit";

describe("assertRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests within the limit", () => {
    expect(() =>
      assertRateLimit({
        key: "login:user@example.com",
        limit: 2,
        windowMs: 1000,
        message: "limited",
        now: 1000,
      }),
    ).not.toThrow();

    expect(() =>
      assertRateLimit({
        key: "login:user@example.com",
        limit: 2,
        windowMs: 1000,
        message: "limited",
        now: 1001,
      }),
    ).not.toThrow();
  });

  it("rejects requests over the limit within the window", () => {
    assertRateLimit({
      key: "login:user@example.com",
      limit: 1,
      windowMs: 1000,
      message: "limited",
      now: 1000,
    });

    expect(() =>
      assertRateLimit({
        key: "login:user@example.com",
        limit: 1,
        windowMs: 1000,
        message: "limited",
        now: 1001,
      }),
    ).toThrow("limited");
  });

  it("resets after the window passes", () => {
    assertRateLimit({
      key: "login:user@example.com",
      limit: 1,
      windowMs: 1000,
      message: "limited",
      now: 1000,
    });

    expect(() =>
      assertRateLimit({
        key: "login:user@example.com",
        limit: 1,
        windowMs: 1000,
        message: "limited",
        now: 2001,
      }),
    ).not.toThrow();
  });
});
