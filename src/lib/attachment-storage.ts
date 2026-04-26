import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildDedupedFilename } from "@/lib/attachment-filename";

const ATTACHMENT_STORAGE_PREFIX = "/attachments";

export type AttachmentBucket = Pick<R2Bucket, "delete" | "get" | "head" | "put">;

function getAttachmentBucket(bucket?: AttachmentBucket) {
  if (bucket) {
    return bucket;
  }

  const { env } = getCloudflareContext();

  if (!env.ATTACHMENTS) {
    throw new Error("ATTACHMENTS R2 bucket binding is not configured.");
  }

  return env.ATTACHMENTS;
}

function buildAttachmentKey(ownerType: "comments" | "posts", ownerId: string, filename: string) {
  return `${ownerType}/${ownerId}/${filename}`;
}

export function getAttachmentKey(storagePath: string) {
  const normalizedPath = storagePath.replace(/^\/+/, "");

  if (normalizedPath.startsWith("attachments/")) {
    return normalizedPath.slice("attachments/".length);
  }

  if (normalizedPath.startsWith("uploads/")) {
    return normalizedPath.slice("uploads/".length);
  }

  return normalizedPath;
}

export function getAttachmentStoragePath(key: string) {
  return `${ATTACHMENT_STORAGE_PREFIX}/${key.replace(/^\/+/, "")}`;
}

export function getAttachmentStorageRoot() {
  return "r2://ATTACHMENTS";
}

async function saveAttachments(input: {
  ownerType: "comments" | "posts";
  ownerId: string;
  files: File[];
  existingNames?: Iterable<string>;
  bucket?: AttachmentBucket;
  createAttachment: (data: {
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }) => Promise<void>;
}) {
  if (input.files.length === 0) {
    return;
  }

  const bucket = getAttachmentBucket(input.bucket);
  const usedNames = new Set(input.existingNames ?? []);

  for (const file of input.files) {
    const originalFilename = buildDedupedFilename(file.name, usedNames);
    const key = buildAttachmentKey(input.ownerType, input.ownerId, originalFilename);
    const body = await file.arrayBuffer();
    const mimeType = file.type || "application/octet-stream";

    await bucket.put(key, body, {
      httpMetadata: {
        contentType: mimeType,
      },
    });
    await input.createAttachment({
      storagePath: getAttachmentStoragePath(key),
      originalFilename,
      mimeType,
      sizeBytes: body.byteLength,
    });
  }
}

export async function savePostAttachments(input: {
  postId: string;
  files: File[];
  existingNames?: Iterable<string>;
  bucket?: AttachmentBucket;
  createAttachment: (data: {
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }) => Promise<void>;
}) {
  await saveAttachments({
    ownerType: "posts",
    ownerId: input.postId,
    files: input.files,
    existingNames: input.existingNames,
    bucket: input.bucket,
    createAttachment: input.createAttachment,
  });
}

export async function saveCommentAttachments(input: {
  commentId: string;
  files: File[];
  existingNames?: Iterable<string>;
  bucket?: AttachmentBucket;
  createAttachment: (data: {
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }) => Promise<void>;
}) {
  await saveAttachments({
    ownerType: "comments",
    ownerId: input.commentId,
    files: input.files,
    existingNames: input.existingNames,
    bucket: input.bucket,
    createAttachment: input.createAttachment,
  });
}

export async function getStoredAttachment(storagePath: string, bucket?: AttachmentBucket) {
  return getAttachmentBucket(bucket).get(getAttachmentKey(storagePath));
}

export async function deleteStoredAttachment(storagePath: string, bucket?: AttachmentBucket) {
  const attachmentBucket = getAttachmentBucket(bucket);
  const key = getAttachmentKey(storagePath);
  const existingObject = await attachmentBucket.head(key);

  if (!existingObject) {
    return false;
  }

  await attachmentBucket.delete(key);
  return true;
}
