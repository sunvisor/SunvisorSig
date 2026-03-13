import { prisma } from "@/lib/prisma";

function normalizeHandle(source: string) {
  return source
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export async function buildUniqueMentionHandle(source: string) {
  const base = normalizeHandle(source) || "user";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: {
        mentionHandle: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
