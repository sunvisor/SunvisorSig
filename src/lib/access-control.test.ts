import { describe, expect, it } from "vitest";
import { isSystemAdmin } from "@/lib/auth";
import { isForumMember } from "@/lib/forum-data";

describe("access control helpers", () => {
  it("identifies system admins", () => {
    expect(isSystemAdmin({ systemRole: "ADMIN" })).toBe(true);
    expect(isSystemAdmin({ systemRole: "USER" })).toBe(false);
  });

  it("detects forum membership by user id", () => {
    const forum = {
      members: [{ userId: "user-1" }, { userId: "user-2" }],
    };

    expect(isForumMember(forum, "user-1")).toBe(true);
    expect(isForumMember(forum, "user-3")).toBe(false);
  });
});
