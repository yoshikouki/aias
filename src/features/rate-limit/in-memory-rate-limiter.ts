import type { RateLimiter } from "./rate-limit";
import type { RateLimitConfig, RateLimitInfo, RateLimitResult } from "./types";

export class InMemoryRateLimiter implements Pick<RateLimiter, "check" | "reset"> {
  private requests: Map<string, number[]>;
  private config: RateLimitConfig;
  private currentTime: number;

  constructor(config: RateLimitConfig, initialTime = 0) {
    if (config.maxRequests <= 0) {
      throw new Error("maxRequests must be positive");
    }
    if (config.windowMs <= 0) {
      throw new Error("windowMs must be positive");
    }

    this.requests = new Map();
    this.config = config;
    this.currentTime = initialTime;
  }

  private cleanup(key: string): void {
    const timestamps = this.requests.get(key) || [];
    const windowStart = this.currentTime - this.config.windowMs;

    // ウィンドウ期間外のリクエストを削除
    const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    if (validTimestamps.length === 0) {
      this.requests.delete(key);
    } else {
      this.requests.set(key, validTimestamps);
    }
  }

  private getRateLimitInfo(key: string): RateLimitInfo {
    const timestamps = this.requests.get(key) || [];
    const windowStart = this.currentTime - this.config.windowMs;

    // 有効なタイムスタンプの数を計算
    const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);
    const count = validTimestamps.length;

    return {
      remaining: Math.max(0, this.config.maxRequests - count),
      reset: windowStart + this.config.windowMs,
      limit: this.config.maxRequests,
    };
  }

  async check(key: string): Promise<RateLimitResult> {
    this.cleanup(key);
    const info = this.getRateLimitInfo(key);

    if (info.remaining <= 0) {
      return {
        success: false,
        info,
      };
    }

    // リクエストを記録
    const timestamps = this.requests.get(key) || [];
    timestamps.push(this.currentTime);
    this.requests.set(key, timestamps);

    return {
      success: true,
      info: this.getRateLimitInfo(key),
    };
  }

  // テスト用のヘルパーメソッド
  advanceTime(ms: number): void {
    this.currentTime += ms;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }
}
