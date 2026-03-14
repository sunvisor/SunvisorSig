import { AppError } from "@/lib/app-error";

type RateLimitState = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  rateLimitStore?: Map<string, RateLimitState>;
};

const rateLimitStore = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitState>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimitStore = rateLimitStore;
}

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  message: string;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const current = rateLimitStore.get(input.key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return;
  }

  if (current.count >= input.limit) {
    throw new AppError("RATE_LIMITED", input.message);
  }

  rateLimitStore.set(input.key, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}

