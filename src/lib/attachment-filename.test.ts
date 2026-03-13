import { describe, expect, it } from "vitest";
import { buildDedupedFilename } from "@/lib/attachment-filename";

describe("buildDedupedFilename", () => {
  it("keeps the first filename as-is", () => {
    const usedNames = new Set<string>();

    expect(buildDedupedFilename("report.pdf", usedNames)).toBe("report.pdf");
  });

  it("appends numeric suffixes starting from 2", () => {
    const usedNames = new Set<string>(["report.pdf", "report(2).pdf"]);

    expect(buildDedupedFilename("report.pdf", usedNames)).toBe("report(3).pdf");
  });

  it("sanitizes invalid characters and collapses whitespace", () => {
    const usedNames = new Set<string>();

    expect(buildDedupedFilename('  a  /b:*?"<>|  .txt  ', usedNames)).toBe("a b .txt");
  });

  it("falls back to file when filename becomes empty", () => {
    const usedNames = new Set<string>();

    expect(buildDedupedFilename('////', usedNames)).toBe("file");
  });
});
