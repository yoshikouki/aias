import { beforeEach, describe, expect, it } from "vitest";
import { loadAIProviderConfig } from "./config";
import { ConfigError } from "./errors";

describe("loadAIProviderConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("should load valid configuration", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "30";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "30000";
    process.env.AI_RATE_LIMIT_KEY = "test-key";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      anthropicApiKey: "test-key",
      geminiApiKey: "test-key",
      rateLimit: {
        maxRequests: 30,
        windowMs: 30000,
      },
      rateLimitKey: "test-key",
    });
  });

  it("should use default values when not specified", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      anthropicApiKey: "test-key",
      geminiApiKey: "test-key",
    });
  });

  it("should throw error when API key is missing", () => {
    const originalEnv = { ...process.env };
    process.env = {};
    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
    process.env = originalEnv;
  });

  it("should throw error when rate limit max requests is invalid", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "invalid";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });

  it("should throw error when rate limit window is invalid", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "invalid";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });
});
