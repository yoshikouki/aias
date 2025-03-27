export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

export interface RateLimitResult {
  success: boolean;
  info: RateLimitInfo;
}

export interface RateLimitError {
  type: "rate_limit";
  message: string;
  info: RateLimitInfo;
}

export class RateLimitExceededError extends Error implements RateLimitError {
  readonly type = "rate_limit" as const;
  readonly info: RateLimitError["info"];

  constructor(info: RateLimitError["info"]) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.info = info;
  }
}
