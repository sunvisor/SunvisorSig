import { purgeExpiredDeletedData } from "@/lib/deletion-service";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

type SeedPlatformEnv = {
  DB?: D1Database;
};

function getLocalDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("file:")) {
    return databaseUrl;
  }

  return "file:./dev.db";
}

async function createPrismaClient() {
  if (process.env.PURGE_DATABASE !== "file") {
    const { getPlatformProxy } = await import("wrangler");
    const platform = await getPlatformProxy<SeedPlatformEnv>({ envFiles: [] });

    if (platform.env.DB) {
      return {
        prisma: new PrismaClient({
          adapter: new PrismaD1(platform.env.DB),
        }),
        dispose: platform.dispose,
      };
    }

    await platform.dispose();
  }

  return {
    prisma: new PrismaClient({
      datasourceUrl: getLocalDatabaseUrl(),
    }),
    dispose: async () => {},
  };
}

async function main() {
  const { prisma, dispose } = await createPrismaClient();
  const result = await purgeExpiredDeletedData(new Date(), prisma);
  console.log(JSON.stringify(result, null, 2));

  await prisma.$disconnect();
  await dispose();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
