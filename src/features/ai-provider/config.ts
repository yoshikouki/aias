import type { AIProviderConfig } from "./types";

/**
 * 環境変数からAIProviderの設定を読み込む
 */
export function loadAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is required");
  }

  const config: AIProviderConfig = {
    apiKey,
    model: process.env.AI_MODEL,
    temperature: process.env.AI_TEMPERATURE
      ? Number.parseFloat(process.env.AI_TEMPERATURE)
      : undefined,
  };

  // レートリミットの設定を読み込む
  const maxRequests = process.env.AI_RATE_LIMIT_MAX_REQUESTS;
  const windowMs = process.env.AI_RATE_LIMIT_WINDOW_MS;
  const rateLimitKey = process.env.AI_RATE_LIMIT_KEY;

  if (maxRequests && windowMs) {
    config.rateLimit = {
      maxRequests: Number.parseInt(maxRequests, 10),
      windowMs: Number.parseInt(windowMs, 10),
    };
    if (rateLimitKey) {
      config.rateLimitKey = rateLimitKey;
    }
  }

  return config;
}
