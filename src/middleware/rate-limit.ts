import { RATE_LIMIT_CONFIG } from "../constants";
import { RateLimiter } from "../rate-limit";
import type { RateLimitError } from "../types";

let limiter: RateLimiter;

export function initRateLimiter(getTime: () => number = Date.now) {
  limiter = new RateLimiter(RATE_LIMIT_CONFIG, getTime);
}

initRateLimiter();

export class RateLimitExceededError extends Error implements RateLimitError {
  readonly type = "rate_limit" as const;
  readonly info: RateLimitError["info"];

  constructor(info: RateLimitError["info"]) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.info = info;
  }
}

export function withRateLimit(key: string) {
  return async function rateLimitMiddleware<T>(next: () => Promise<T>): Promise<T> {
    const result = await limiter.check(key);

    if (!result.success) {
      throw new RateLimitExceededError(result.info);
    }

    return next();
  };
}
