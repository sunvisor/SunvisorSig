import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteStoredAttachment,
  saveCommentAttachments,
  savePostAttachments,
} from "@/lib/attachment-storage";

const createdPaths = new Set<string>();

function trackPath(pathname: string) {
  createdPaths.add(pathname);
  return pathname;
}

async function exists(pathname: string) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const pathname of createdPaths) {
    await rm(pathname, { recursive: true, force: true }).catch(() => {});
  }
  createdPaths.clear();
});

describe("attachment storage helpers", () => {
  it("dedupes post attachment names when the same filename already exists", async () => {
    const postId = `test-post-${Date.now()}`;
    const uploadDir = trackPath(path.join(process.cwd(), "public", "uploads", "posts", postId));
    const created: Array<{ storagePath: string; originalFilename: string }> = [];

    await savePostAttachments({
      postId,
      files: [
        new File(["alpha"], "report.pdf", { type: "application/pdf" }),
        new File(["beta"], "report.pdf", { type: "application/pdf" }),
      ],
      existingNames: ["report.pdf"],
      createAttachment: async (attachment) => {
        created.push({
          storagePath: attachment.storagePath,
          originalFilename: attachment.originalFilename,
        });
      },
    });

    expect(created.map((item) => item.originalFilename)).toEqual([
      "report(2).pdf",
      "report(3).pdf",
    ]);

    expect(await readFile(path.join(uploadDir, "report(2).pdf"), "utf8")).toBe("alpha");
    expect(await readFile(path.join(uploadDir, "report(3).pdf"), "utf8")).toBe("beta");
  });

  it("stores comment attachments under the comment upload directory", async () => {
    const commentId = `test-comment-${Date.now()}`;
    const uploadDir = trackPath(
      path.join(process.cwd(), "public", "uploads", "comments", commentId),
    );
    const created: string[] = [];

    await saveCommentAttachments({
      commentId,
      files: [new File(["image-bytes"], "capture.png", { type: "image/png" })],
      createAttachment: async (attachment) => {
        created.push(attachment.storagePath);
      },
    });

    expect(created).toEqual([`/uploads/comments/${commentId}/capture.png`]);
    expect(await readFile(path.join(uploadDir, "capture.png"), "utf8")).toBe("image-bytes");
  });

  it("removes the attachment file and cleans up empty parent directories", async () => {
    const postId = `delete-post-${Date.now()}`;
    const uploadDir = trackPath(path.join(process.cwd(), "public", "uploads", "posts", postId));
    const nestedDir = path.join(uploadDir);
    const filePath = path.join(nestedDir, "guide.pdf");

    await mkdir(nestedDir, { recursive: true });
    await writeFile(filePath, "payload");

    await deleteStoredAttachment(`/uploads/posts/${postId}/guide.pdf`);

    expect(await exists(filePath)).toBe(false);
    expect(
      !(await exists(uploadDir)) || (await readdir(uploadDir)).length === 0,
    ).toBe(true);
  });
});
