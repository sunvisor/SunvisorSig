// Cloudflare Workers' Web Crypto caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH_BITS = 256;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }

  return diff === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const saltBytes = new Uint8Array(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes.buffer,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH_BITS,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);

  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterations, saltHex, hashHex] = storedHash.split(":");

  if (algorithm !== "pbkdf2-sha256" || iterations !== String(PBKDF2_ITERATIONS)) {
    return false;
  }

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  const stored = hexToBytes(hashHex);

  if (!salt || !stored) {
    return false;
  }

  const computed = await derivePasswordHash(password, salt);
  return constantTimeEqual(computed, stored);
}
