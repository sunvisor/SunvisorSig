import type { PostStatus, Prisma } from "@prisma/client";

export function normalizePostStatusFilter(status: string): PostStatus | null | undefined {
  const normalizedStatus = status.trim();

  if (normalizedStatus === "NONE") {
    return null;
  }

  if (
    normalizedStatus === "TODO" ||
    normalizedStatus === "IN_PROGRESS" ||
    normalizedStatus === "DONE"
  ) {
    return normalizedStatus;
  }

  return undefined;
}

export function buildChannelPostSearchWhere(query: string, status: string) {
  const normalizedQuery = query.trim();
  const statusFilter = normalizePostStatusFilter(status);

  const where: Prisma.PostWhereInput = {
    ...(normalizedQuery
      ? {
          OR: [
            {
              title: {
                contains: normalizedQuery,
              },
            },
            {
              bodyMarkdown: {
                contains: normalizedQuery,
              },
            },
          ],
        }
      : {}),
    ...(statusFilter !== undefined ? { status: statusFilter } : {}),
  };

  return where;
}
