import { describe, expect, it } from "vitest";
import { maskWebhookUrl } from "@/lib/webhook-endpoints";

describe("maskWebhookUrl", () => {
  it("masks a valid URL while preserving origin", () => {
    expect(
      maskWebhookUrl("https://hooks.slack.com/services/T12345678/B12345678/abcdefghijklmnop"),
    ).toBe("https://hooks.slack.com/...ghijklmnop");
  });

  it("masks a non-url string defensively", () => {
    expect(maskWebhookUrl("not-a-url-secret-token")).toBe("***secret-token");
  });
});
