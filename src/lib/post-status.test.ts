import { describe, expect, it } from "vitest";
import { getPostStatusLabel, getPostStatusTone } from "@/lib/post-status";

describe("post status helpers", () => {
  it("returns labels for known statuses", () => {
    expect(getPostStatusLabel("TODO")).toBe("未対応");
    expect(getPostStatusLabel("IN_PROGRESS")).toBe("対応中");
    expect(getPostStatusLabel("DONE")).toBe("完了");
  });

  it("falls back to 状態管理なし for null or unknown values", () => {
    expect(getPostStatusLabel(null)).toBe("状態管理なし");
    expect(getPostStatusLabel("UNKNOWN")).toBe("状態管理なし");
  });

  it("returns tone classes for statuses", () => {
    expect(getPostStatusTone("TODO")).toContain("amber");
    expect(getPostStatusTone("IN_PROGRESS")).toContain("sky");
    expect(getPostStatusTone("DONE")).toContain("emerald");
    expect(getPostStatusTone(null)).toContain("slate");
  });
});
