import { describe, expect, it } from "vitest";
import {
  deleteStoredAttachment,
  getAttachmentKey,
  getStoredAttachment,
  saveCommentAttachments,
  savePostAttachments,
} from "@/lib/attachment-storage";

type StoredObject = {
  body: ArrayBuffer;
  contentType: string;
};

function createMemoryBucket() {
  const objects = new Map<string, StoredObject>();

  return {
    bucket: {
      async put(key: string, value: ArrayBuffer | ArrayBufferView | string, options?: R2PutOptions) {
        const contentType =
          options?.httpMetadata instanceof Headers
            ? (options.httpMetadata.get("Content-Type") ?? "application/octet-stream")
            : (options?.httpMetadata?.contentType ?? "application/octet-stream");
        const body =
          typeof value === "string"
            ? new TextEncoder().encode(value).buffer
            : value instanceof ArrayBuffer
              ? value
              : new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer;

        objects.set(key, {
          body,
          contentType,
        });

        return null as unknown as R2Object;
      },
      async get(key: string) {
        const object = objects.get(key);

        if (!object) {
          return null;
        }

        return {
          body: new Response(object.body).body,
          httpMetadata: {
            contentType: object.contentType,
          },
          size: object.body.byteLength,
        } as R2ObjectBody;
      },
      async head(key: string) {
        const object = objects.get(key);

        if (!object) {
          return null;
        }

        return {
          size: object.body.byteLength,
        } as R2Object;
      },
      async delete(key: string) {
        objects.delete(key);
      },
    } satisfies Pick<R2Bucket, "delete" | "get" | "head" | "put">,
    objects,
  };
}

async function readObjectText(object: R2ObjectBody | null) {
  if (!object) {
    return null;
  }

  return new Response(object.body).text();
}

describe("attachment storage helpers", () => {
  it("dedupes post attachment names and stores objects in R2", async () => {
    const { bucket } = createMemoryBucket();
    const postId = `test-post-${Date.now()}`;
    const created: Array<{ storagePath: string; originalFilename: string }> = [];

    await savePostAttachments({
      postId,
      bucket,
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

    expect(created).toEqual([
      {
        storagePath: `/attachments/posts/${postId}/report(2).pdf`,
        originalFilename: "report(2).pdf",
      },
      {
        storagePath: `/attachments/posts/${postId}/report(3).pdf`,
        originalFilename: "report(3).pdf",
      },
    ]);

    await expect(
      readObjectText(await getStoredAttachment(created[0].storagePath, bucket)),
    ).resolves.toBe("alpha");
    await expect(
      readObjectText(await getStoredAttachment(created[1].storagePath, bucket)),
    ).resolves.toBe("beta");
  });

  it("stores comment attachments under the comment key prefix", async () => {
    const { bucket } = createMemoryBucket();
    const commentId = `test-comment-${Date.now()}`;
    const created: string[] = [];

    await saveCommentAttachments({
      commentId,
      bucket,
      files: [new File(["image-bytes"], "capture.png", { type: "image/png" })],
      createAttachment: async (attachment) => {
        created.push(attachment.storagePath);
      },
    });

    expect(created).toEqual([`/attachments/comments/${commentId}/capture.png`]);
    await expect(
      readObjectText(await getStoredAttachment(created[0], bucket)),
    ).resolves.toBe("image-bytes");
  });

  it("removes an attachment object from R2", async () => {
    const { bucket } = createMemoryBucket();
    const postId = `delete-post-${Date.now()}`;
    const storagePath = `/attachments/posts/${postId}/guide.pdf`;

    await bucket.put(getAttachmentKey(storagePath), "payload");

    await expect(deleteStoredAttachment(storagePath, bucket)).resolves.toBe(true);
    await expect(getStoredAttachment(storagePath, bucket)).resolves.toBeNull();
  });

  it("understands legacy upload paths when deleting", async () => {
    const { bucket } = createMemoryBucket();
    const postId = `legacy-post-${Date.now()}`;

    await bucket.put(`posts/${postId}/guide.pdf`, "payload");

    await expect(
      deleteStoredAttachment(`/uploads/posts/${postId}/guide.pdf`, bucket),
    ).resolves.toBe(true);
  });
});
