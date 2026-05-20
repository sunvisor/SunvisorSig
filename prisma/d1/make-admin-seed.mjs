// 本番 D1 へ投入する管理者ユーザー 1 件分の INSERT SQL を生成する。
// パスワードはリポジトリに残さないよう環境変数で受け取り、
// 出力先 seed.admin.sql は .gitignore 対象とする。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Cloudflare Workers' Web Crypto caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH_BITS = 256;

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    PBKDF2_KEY_LENGTH_BITS,
  );

  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function readConfig() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is required");
  }

  return {
    password,
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    displayName: process.env.ADMIN_DISPLAY_NAME ?? "Administrator",
    mentionHandle: process.env.ADMIN_HANDLE ?? "admin",
  };
}

async function buildInsertSql(config) {
  const passwordHash = await hashPassword(config.password);
  // Prisma は SQLite/D1 の DateTime を Unix ミリ秒 (整数) で保存する。
  const now = Date.now();
  const values = [
    sqlString(crypto.randomUUID()),
    sqlString(config.displayName),
    sqlString(config.email),
    sqlString(config.mentionHandle),
    sqlString(passwordHash),
    "'ADMIN'",
    "'ACTIVE'",
    String(now),
    String(now),
  ].join(", ");

  return (
    'INSERT INTO "User" ' +
    '("id", "displayName", "email", "mentionHandle", "passwordHash", ' +
    '"systemRole", "status", "createdAt", "updatedAt")\n' +
    `VALUES (${values});\n`
  );
}

async function main() {
  const config = readConfig();
  const sql = await buildInsertSql(config);
  const outPath = join(dirname(fileURLToPath(import.meta.url)), "seed.admin.sql");

  writeFileSync(outPath, sql);

  console.log(`Wrote admin seed SQL to ${outPath}`);
  console.log(`  email:         ${config.email}`);
  console.log(`  mentionHandle: ${config.mentionHandle}`);
  console.log("Apply it with:");
  console.log("  wrangler d1 execute sunvisor-sig --remote --file=prisma/d1/seed.admin.sql");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
