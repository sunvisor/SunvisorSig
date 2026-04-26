import "dotenv/config";
import { defineConfig } from "prisma/config";

function getLocalDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("file:")) {
    return databaseUrl;
  }

  return "file:./dev.db";
}

process.env.DATABASE_URL = getLocalDatabaseUrl();

export default defineConfig({
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
