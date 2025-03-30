import { describe, expect, test } from "vitest";
import { loadConfig } from "./config";
import type { EnvAdapter } from "./types";

describe("loadConfig", () => {
  const createMockEnvAdapter = (env: Record<string, string | undefined>): EnvAdapter => ({
    get: (key: string) => env[key],
  });

  test("should return success with config when all environment variables are set", () => {
    const mockEnv = {
      GEMINI_API_KEY: "test-api-key",
      DISCORD_TOKEN: "test-token",
    };

    const result = loadConfig(createMockEnvAdapter(mockEnv));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual({
        gemini: {
          apiKey: "test-api-key",
        },
        discord: {
          token: "test-token",
        },
      });
    }
  });

  test("should return failure when GEMINI_API_KEY is missing", () => {
    const mockEnv = {
      DISCORD_TOKEN: "test-token",
    };

    const result = loadConfig(createMockEnvAdapter(mockEnv));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("GEMINI_API_KEY: Required");
      expect(result.error.code).toBe("INVALID_ENV_VARS");
    }
  });

  test("should return failure when Discord environment variables are missing", () => {
    const mockEnv = {
      GEMINI_API_KEY: "test-api-key",
    };

    const result = loadConfig(createMockEnvAdapter(mockEnv));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("DISCORD_TOKEN: Required");
      expect(result.error.code).toBe("INVALID_ENV_VARS");
    }
  });

  test("should return failure when environment variables are empty strings", () => {
    const mockEnv = {
      GEMINI_API_KEY: "",
      DISCORD_TOKEN: "",
    };

    const result = loadConfig(createMockEnvAdapter(mockEnv));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("GEMINI_API_KEY: Required, DISCORD_TOKEN: Required");
      expect(result.error.code).toBe("INVALID_ENV_VARS");
    }
  });

  test("should use default env adapter when no adapter is provided", () => {
    // 実際のprocess.envを使用するテスト
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.DISCORD_TOKEN = "test-token";

    const result = loadConfig();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual({
        gemini: {
          apiKey: "test-api-key",
        },
        discord: {
          token: "test-token",
        },
      });
    }
  });
});
