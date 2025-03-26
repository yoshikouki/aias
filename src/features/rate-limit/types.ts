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
