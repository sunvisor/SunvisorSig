import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export function signSessionValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function encodeSessionToken(payload: SessionPayload, secret: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signSessionValue(data, secret);

  return `${data}.${signature}`;
}

export function decodeSessionToken(token: string, secret: string): SessionPayload | null {
  const [data, signature] = token.split(".");

  if (!data || !signature) {
    return null;
  }

  const expectedSignature = signSessionValue(data, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;

    if (!payload.userId || !payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
