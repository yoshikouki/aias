export const RATE_LIMIT_CONFIG = {
  maxRequests: 15, // 1分間に15回
  windowMs: 60000, // 1分 = 60000ミリ秒
} as const;
