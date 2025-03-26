import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAIProviderConfig } from "./config";

describe("loadAIProviderConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("必須の環境変数が設定されていない場合にエラーを投げること", () => {
    delete process.env.AI_API_KEY;
    expect(() => loadAIProviderConfig()).toThrow("AI_API_KEY environment variable is required");
  });

  it("基本的な設定を読み込めること", () => {
    process.env.AI_API_KEY = "test-api-key";
    process.env.AI_MODEL = "test-model";
    process.env.AI_TEMPERATURE = "0.7";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      apiKey: "test-api-key",
      model: "test-model",
      temperature: 0.7,
    });
  });

  it("レートリミットの設定を読み込めること", () => {
    process.env.AI_API_KEY = "test-api-key";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "10";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.AI_RATE_LIMIT_KEY = "test-user";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      apiKey: "test-api-key",
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000,
      },
      rateLimitKey: "test-user",
    });
  });

  it("レートリミットの設定が一部欠けている場合は無視すること", () => {
    process.env.AI_API_KEY = "test-api-key";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "10";
    // AI_RATE_LIMIT_WINDOW_MS は設定しない

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      apiKey: "test-api-key",
    });
  });
});
