import { RATE_LIMIT_CONFIG } from "./constants";
import { RateLimiter } from "./rate-limit";
import { RateLimitExceededError } from "./types";

let globalRateLimiter: RateLimiter;

export function initRateLimiter(getTime: () => number = Date.now) {
  globalRateLimiter = new RateLimiter(RATE_LIMIT_CONFIG, getTime);
}

initRateLimiter();

export function withRateLimit(key: string) {
  return async function rateLimitMiddleware<T>(next: () => Promise<T>): Promise<T> {
    if (!globalRateLimiter) {
      throw new Error("Rate limiter is not initialized");
    }

    const result = await globalRateLimiter.check(key);

    if (!result.success) {
      throw new RateLimitExceededError(result.info);
    }

    return next();
  };
}
