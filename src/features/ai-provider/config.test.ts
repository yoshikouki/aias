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
});
