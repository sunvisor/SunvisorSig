import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import { buildDedupedFilename } from "@/lib/attachment-filename";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

async function exists(pathname: string) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function removeEmptyParents(startDirectory: string) {
  let current = startDirectory;

  while (current.startsWith(uploadsRoot) && current !== uploadsRoot) {
    const children = await readdir(current).catch(() => null);

    if (!children || children.length > 0) {
      return;
    }

    await rm(current, { recursive: false, force: true }).catch(() => {});
    current = dirname(current);
  }
}

function toPublicFilePath(storagePath: string) {
  return path.join(process.cwd(), "public", storagePath.replace(/^\/+/, ""));
}

export async function savePostAttachments(input: {
  postId: string;
  files: File[];
  existingNames?: Iterable<string>;
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

  const uploadDir = path.join(process.cwd(), "public", "uploads", "posts", input.postId);
  await mkdir(uploadDir, { recursive: true });
  const usedNames = new Set(input.existingNames ?? []);

  for (const file of input.files) {
    const originalFilename = buildDedupedFilename(file.name, usedNames);
    const storagePath = `/uploads/posts/${input.postId}/${originalFilename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, originalFilename), buffer);
    await input.createAttachment({
      storagePath,
      originalFilename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    });
  }
}

export async function saveCommentAttachments(input: {
  commentId: string;
  files: File[];
  existingNames?: Iterable<string>;
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

  const uploadDir = path.join(process.cwd(), "public", "uploads", "comments", input.commentId);
  await mkdir(uploadDir, { recursive: true });
  const usedNames = new Set(input.existingNames ?? []);

  for (const file of input.files) {
    const originalFilename = buildDedupedFilename(file.name, usedNames);
    const storagePath = `/uploads/comments/${input.commentId}/${originalFilename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, originalFilename), buffer);
    await input.createAttachment({
      storagePath,
      originalFilename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    });
  }
}

export async function deleteStoredAttachment(storagePath: string) {
  const absolutePath = toPublicFilePath(storagePath);

  if (!(await exists(absolutePath))) {
    return;
  }

  await rm(absolutePath, { force: true });
  await removeEmptyParents(dirname(absolutePath));
}
