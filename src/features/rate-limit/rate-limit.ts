import { AsyncLock } from "../../lib/async-lock";
import type { RateLimitConfig, RateLimitInfo, RateLimitResult } from "./types";
import { RateLimitExceededError } from "./types";

export class RateLimiter {
  private requests: Map<string, number[]>;
  private config: RateLimitConfig;
  private getTime: () => number;
  private lock: AsyncLock;

  constructor(config: RateLimitConfig, getTime: () => number = Date.now) {
    if (config.maxRequests <= 0) {
      throw new Error("maxRequests must be positive");
    }
    if (config.windowMs <= 0) {
      throw new Error("windowMs must be positive");
    }

    this.requests = new Map();
    this.config = config;
    this.getTime = getTime;
    this.lock = new AsyncLock();
  }

  private cleanup(key: string): void {
    const now = this.getTime();
    const timestamps = this.requests.get(key) || [];
    const windowStart = now - this.config.windowMs;

    // ウィンドウ期間外のリクエストを削除
    const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    if (validTimestamps.length === 0) {
      this.requests.delete(key);
    } else {
      this.requests.set(key, validTimestamps);
    }
  }

  private cleanupAll(): void {
    const now = this.getTime();
    for (const [key, timestamps] of this.requests.entries()) {
      const windowStart = now - this.config.windowMs;
      const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  private findFirstValidIndex(timestamps: number[], windowStart: number): number {
    let left = 0;
    let right = timestamps.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const timestamp = timestamps[mid];
      if (timestamp === undefined) {
        return left;
      }
      if (timestamp > windowStart) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return left;
  }

  private getRateLimitInfo(key: string): RateLimitInfo {
    const now = this.getTime();
    const timestamps = this.requests.get(key) || [];
    const windowStart = now - this.config.windowMs;

    // 二分探索で有効なタイムスタンプの数を計算
    const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);
    const count = validTimestamps.length;

    return {
      remaining: Math.max(0, this.config.maxRequests - count),
      reset: windowStart + this.config.windowMs,
      limit: this.config.maxRequests,
    };
  }

  async check(key: string): Promise<RateLimitResult> {
    return await this.lock.acquire(key, async () => {
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
      timestamps.push(this.getTime());
      this.requests.set(key, timestamps);

      // 定期的に全体的なクリーンアップを実行
      if (Math.random() < 0.01) {
        // 1%の確率でクリーンアップを実行
        this.cleanupAll();
      }

      return {
        success: true,
        info: this.getRateLimitInfo(key),
      };
    });
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

let globalRateLimiter: RateLimiter | null = null;

export function initRateLimiter(getTime: () => number = Date.now): void {
  globalRateLimiter = new RateLimiter(
    {
      maxRequests: 15,
      windowMs: 1000,
    },
    getTime,
  );
}

export const withRateLimit = (key: string) => {
  return async <T>(next: () => Promise<T>): Promise<T> => {
    if (!globalRateLimiter) {
      throw new Error("Rate limiter is not initialized");
    }

    const limiter = globalRateLimiter;
    const result = await limiter.check(key);

    if (!result.success) {
      throw new RateLimitExceededError(result.info);
    }

    return next();
  };
};
