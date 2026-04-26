import { describe, expect, it } from "vitest";
import {
  buildChannelPostSearchWhere,
  normalizePostStatusFilter,
} from "@/lib/channel-post-search";

describe("normalizePostStatusFilter", () => {
  it("maps NONE to null", () => {
    expect(normalizePostStatusFilter("NONE")).toBeNull();
  });

  it("accepts known statuses", () => {
    expect(normalizePostStatusFilter("TODO")).toBe("TODO");
    expect(normalizePostStatusFilter("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(normalizePostStatusFilter("DONE")).toBe("DONE");
  });

  it("ignores invalid statuses", () => {
    expect(normalizePostStatusFilter("INVALID")).toBeUndefined();
    expect(normalizePostStatusFilter("")).toBeUndefined();
  });
});

describe("buildChannelPostSearchWhere", () => {
  it("builds a title/body search for a keyword", () => {
    expect(buildChannelPostSearchWhere("error", "")).toEqual({
      OR: [
        {
          title: {
            contains: "error",
          },
        },
        {
          bodyMarkdown: {
            contains: "error",
          },
        },
      ],
    });
  });

  it("builds a status-only filter", () => {
    expect(buildChannelPostSearchWhere("", "DONE")).toEqual({
      status: "DONE",
    });
  });

  it("combines keyword and status filters", () => {
    expect(buildChannelPostSearchWhere("deploy", "TODO")).toEqual({
      OR: [
        {
          title: {
            contains: "deploy",
          },
        },
        {
          bodyMarkdown: {
            contains: "deploy",
          },
        },
      ],
      status: "TODO",
    });
  });

  it("uses null to filter posts without status", () => {
    expect(buildChannelPostSearchWhere("", "NONE")).toEqual({
      status: null,
    });
  });

  it("ignores invalid statuses while keeping the keyword", () => {
    expect(buildChannelPostSearchWhere("alert", "UNKNOWN")).toEqual({
      OR: [
        {
          title: {
            contains: "alert",
          },
        },
        {
          bodyMarkdown: {
            contains: "alert",
          },
        },
      ],
    });
  });
});
