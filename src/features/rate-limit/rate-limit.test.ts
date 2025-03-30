import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { InMemoryRateLimiter } from "./in-memory-rate-limiter";
import type { RateLimitConfig } from "./types";

describe("RateLimiter", () => {
  let rateLimiter: InMemoryRateLimiter;
  const config: RateLimitConfig = {
    maxRequests: 15,
    windowMs: 1000,
  };

  beforeEach(() => {
    rateLimiter = new InMemoryRateLimiter(config);
  });

  afterEach(() => {
    rateLimiter.resetAll();
  });

  test("制限内のリクエストを許可すること", async () => {
    const result = await rateLimiter.check("test");
    expect(result.success).toBe(true);
    expect(result.info).toEqual({
      remaining: 14,
      reset: expect.any(Number),
      limit: 15,
    });
  });

  test("制限を超えた場合にエラーを返すこと", async () => {
    // 制限内のリクエスト
    for (let i = 0; i < 15; i++) {
      const result = await rateLimiter.check("test");
      expect(result.success).toBe(true);
      expect(result.info.remaining).toBe(14 - i);
    }

    // 制限超過のリクエスト
    const result = await rateLimiter.check("test");
    expect(result.success).toBe(false);
    expect(result.info).toEqual({
      remaining: 0,
      reset: expect.any(Number),
      limit: 15,
    });
  });

  test("時間経過後に制限がリセットされること", async () => {
    // 制限内のリクエスト
    for (let i = 0; i < 15; i++) {
      await rateLimiter.check("test");
    }

    // 制限超過のリクエスト
    let result = await rateLimiter.check("test");
    expect(result.success).toBe(false);

    // 時間を進める
    rateLimiter.advanceTime(1000);

    // 制限がリセットされていることを確認
    result = await rateLimiter.check("test");
    expect(result.success).toBe(true);
    expect(result.info.remaining).toBe(14);
  });

  test("異なるキーで独立して制限が機能すること", async () => {
    // key1の制限を満たす
    for (let i = 0; i < 15; i++) {
      await rateLimiter.check("key1");
    }

    // key1は制限超過
    let result = await rateLimiter.check("key1");
    expect(result.success).toBe(false);

    // key2はまだ制限に達していない
    result = await rateLimiter.check("key2");
    expect(result.success).toBe(true);
    expect(result.info.remaining).toBe(14);
  });

  test("古いリクエストが期限切れになること", async () => {
    // 最初のリクエスト
    await rateLimiter.check("test");

    // 時間を少し進める
    rateLimiter.advanceTime(100);

    // 残りのリクエスト
    for (let i = 0; i < 13; i++) {
      await rateLimiter.check("test");
    }

    // 最初のリクエストの期限が切れるまで時間を進める
    rateLimiter.advanceTime(901); // 合計1001ms経過

    // 新しいリクエストが可能になっていることを確認
    const result = await rateLimiter.check("test");
    expect(result.success).toBe(true);
    expect(result.info.remaining).toBe(14);
  });
});
