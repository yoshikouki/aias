import { beforeEach, describe, expect, it } from "vitest";
import { loadAIProviderConfig } from "./config";
import { ConfigError } from "./errors";

describe("loadAIProviderConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("should load valid configuration", () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "gpt-4";
    process.env.AI_TEMPERATURE = "0.5";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "30";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "30000";
    process.env.AI_RATE_LIMIT_KEY = "test-key";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      apiKey: "test-key",
      model: "gpt-4",
      temperature: 0.5,
      rateLimit: {
        maxRequests: 30,
        windowMs: 30000,
      },
      rateLimitKey: "test-key",
    });
  });

  it("should use default values when not specified", () => {
    process.env.AI_API_KEY = "test-key";

    const config = loadAIProviderConfig();

    expect(config).toEqual({
      apiKey: "test-key",
      model: "gpt-4",
      temperature: 0.7,
    });
  });

  it("should throw error when API key is missing", () => {
    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });

  it("should throw error when temperature is invalid", () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_TEMPERATURE = "invalid";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });

  it("should throw error when temperature is out of range", () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_TEMPERATURE = "3";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });

  it("should throw error when rate limit max requests is invalid", () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "invalid";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });

  it("should throw error when rate limit window is invalid", () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_RATE_LIMIT_WINDOW_MS = "invalid";

    expect(() => loadAIProviderConfig()).toThrow(ConfigError);
  });
});
