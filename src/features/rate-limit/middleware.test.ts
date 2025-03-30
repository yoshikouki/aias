import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { InMemoryRateLimiter } from "./in-memory-rate-limiter";
import { initRateLimiter, withRateLimit } from "./middleware";
import type { RateLimitConfig } from "./types";

describe("RateLimit Middleware", () => {
  let rateLimiter: InMemoryRateLimiter;
  const config: RateLimitConfig = {
    maxRequests: 15,
    windowMs: 1000,
  };

  beforeEach(() => {
    rateLimiter = new InMemoryRateLimiter(config);
    initRateLimiter(() => rateLimiter.getCurrentTime());
  });

  afterEach(() => {
    rateLimiter.resetAll();
  });

  test("制限内のリクエストを許可すること", async () => {
    const middleware = withRateLimit("test");
    const next = async () => "success";

    const result = await middleware(next);
    expect(result).toBe("success");
  });

  test("制限を超えた場合にエラーを投げること", async () => {
    const middleware = withRateLimit("test");
    const next = async () => "success";

    // 制限内のリクエスト
    for (let i = 0; i < 15; i++) {
      await middleware(next);
    }

    // 制限超過のリクエスト
    await expect(middleware(next)).rejects.toMatchObject({
      type: "rate_limit",
      message: "Rate limit exceeded",
      info: {
        remaining: 0,
        limit: 15,
        reset: expect.any(Number),
      },
    });
  });

  test("時間経過後に制限がリセットされること", async () => {
    const middleware = withRateLimit("test");
    const next = async () => "success";

    // 制限内のリクエスト
    for (let i = 0; i < 15; i++) {
      await middleware(next);
    }

    // 制限超過のリクエスト
    await expect(middleware(next)).rejects.toThrow();

    // 時間を進める
    rateLimiter.advanceTime(1000);

    // 制限がリセットされていることを確認
    const result = await middleware(next);
    expect(result).toBe("success");
  });

  test("異なるキーで独立して制限が機能すること", async () => {
    const middleware1 = withRateLimit("key1");
    const middleware2 = withRateLimit("key2");
    const next = async () => "success";

    // key1の制限を満たす
    for (let i = 0; i < 15; i++) {
      await middleware1(next);
    }

    // key1は制限超過
    await expect(middleware1(next)).rejects.toThrow();

    // key2はまだ制限に達していない
    const result = await middleware2(next);
    expect(result).toBe("success");
  });
});
