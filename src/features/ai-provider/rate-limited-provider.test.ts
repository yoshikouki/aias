import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { InMemoryRateLimiter } from "../rate-limit/in-memory-rate-limiter";
import type { RateLimitConfig } from "../rate-limit/types";
import { InMemoryAIProvider } from "./in-memory-provider";
import { RateLimitedAIProvider } from "./rate-limited-provider";
import type { Message } from "./types";

describe("RateLimitedAIProvider", () => {
  let aiProvider: InMemoryAIProvider;
  let rateLimiter: InMemoryRateLimiter;
  let rateLimitedProvider: RateLimitedAIProvider;

  const mockMessages: Message[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ];

  const rateLimitConfig: RateLimitConfig = {
    maxRequests: 2,
    windowMs: 1000,
  };

  beforeEach(() => {
    aiProvider = new InMemoryAIProvider();
    rateLimiter = new InMemoryRateLimiter(rateLimitConfig);
    rateLimitedProvider = new RateLimitedAIProvider(
      aiProvider,
      rateLimitConfig,
      "test-key",
      // @ts-expect-error InMemoryRateLimiter は RateLimiter の一部のメソッドのみを実装
      rateLimiter,
    );
  });

  afterEach(() => {
    rateLimiter.resetAll();
  });

  test("制限内のリクエストを許可すること", async () => {
    // AIの応答を設定
    aiProvider.setResponses(["Response 1"]);

    const response = await rateLimitedProvider.generateResponse(mockMessages);
    expect(response).toBe("Response 1");

    // メッセージが正しく渡されていることを確認
    const messages = aiProvider.getMessages();
    expect(messages).toEqual(mockMessages);
  });

  test("制限を超えた場合にエラーを投げること", async () => {
    // AIの応答を設定
    aiProvider.setResponses(["Response 1", "Response 2", "Response 3"]);

    // 最初の2つのリクエストは成功
    await rateLimitedProvider.generateResponse(mockMessages);
    await rateLimitedProvider.generateResponse(mockMessages);

    // 3つ目のリクエストは失敗
    await expect(rateLimitedProvider.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
  });

  test("時間経過後に制限がリセットされること", async () => {
    // AIの応答を設定
    aiProvider.setResponses(["Response 1", "Response 2", "Response 3"]);

    // 制限まで使用
    await rateLimitedProvider.generateResponse(mockMessages);
    await rateLimitedProvider.generateResponse(mockMessages);

    // 制限超過を確認
    await expect(rateLimitedProvider.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );

    // 時間を進める
    rateLimiter.advanceTime(1000);

    // 制限がリセットされていることを確認
    const response = await rateLimitedProvider.generateResponse(mockMessages);
    expect(response).toBe("Response 3");
  });

  test("異なるキーで独立して制限が機能すること", async () => {
    // 2つの異なるプロバイダーを作成
    const provider1 = new RateLimitedAIProvider(
      aiProvider,
      rateLimitConfig,
      "key1",
      // @ts-expect-error InMemoryRateLimiter は RateLimiter の一部のメソッドのみを実装
      rateLimiter,
    );
    const provider2 = new RateLimitedAIProvider(
      aiProvider,
      rateLimitConfig,
      "key2",
      // @ts-expect-error InMemoryRateLimiter は RateLimiter の一部のメソッドのみを実装
      rateLimiter,
    );

    // AIの応答を設定
    aiProvider.setResponses([
      "Response 1",
      "Response 2",
      "Response 3",
      "Response 4",
      "Response 5",
    ]);

    // key1の制限を満たす
    await provider1.generateResponse(mockMessages);
    await provider1.generateResponse(mockMessages);

    // key2も制限まで使用可能
    await provider2.generateResponse(mockMessages);
    await provider2.generateResponse(mockMessages);

    // 両方とも制限超過で失敗
    await expect(provider1.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
    await expect(provider2.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
  });
});
