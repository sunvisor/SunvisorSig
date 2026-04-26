import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getLocalDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("file:")) {
    return databaseUrl;
  }

  return "file:./dev.db";
}

function createPrismaClient() {
  try {
    const { env } = getCloudflareContext();

    if (env.DB) {
      return new PrismaClient({ adapter: new PrismaD1(env.DB), log: ["error"] });
    }
  } catch {
    // next dev, tests, and prisma scripts can use DATABASE_URL without a D1 binding.
  }

  return new PrismaClient({
    datasourceUrl: getLocalDatabaseUrl(),
    log: ["error"],
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});
