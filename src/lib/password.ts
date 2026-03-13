import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const storedBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== computedHash.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedHash);
}
