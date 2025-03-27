import { z } from "zod";

/**
 * AIProviderの設定のデフォルト値
 */
export const DEFAULT_CONFIG = {
  model: "gpt-4",
  temperature: 0.7,
  rateLimit: {
    maxRequests: 60,
    windowMs: 60000, // 1分
  },
} as const;

/**
 * レートリミットの設定スキーマ
 */
export const rateLimitSchema = z.object({
  maxRequests: z.number().positive(),
  windowMs: z.number().positive(),
});

/**
 * レートリミットの環境変数スキーマ
 */
export const rateLimitEnvSchema = z
  .object({
    maxRequests: z.string().optional(),
    windowMs: z.string().optional(),
    key: z.string().optional(),
  })
  .transform((env) => {
    const config: Record<string, unknown> = {};

    if (env.maxRequests || env.windowMs) {
      config.rateLimit = {
        ...(env.maxRequests && { maxRequests: Number.parseInt(env.maxRequests, 10) }),
        ...(env.windowMs && { windowMs: Number.parseInt(env.windowMs, 10) }),
      };
      if (env.key) {
        config.rateLimitKey = env.key;
      }
    }

    return config;
  });

/**
 * AIProviderの設定スキーマ
 */
export const aiProviderConfigSchema = z.object({
  anthropicApiKey: z.string().min(1, "Anthropic API key is required"),
  geminiApiKey: z.string().min(1, "Gemini API key is required"),
  rateLimit: rateLimitSchema.optional(),
  rateLimitKey: z.string().optional(),
});

/**
 * 環境変数から設定を読み込むためのスキーマ
 */
export const envConfigSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
    AI_RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
    AI_RATE_LIMIT_WINDOW_MS: z.string().optional(),
    AI_RATE_LIMIT_KEY: z.string().optional(),
  })
  .transform((env) => ({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    ...rateLimitEnvSchema.parse({
      maxRequests: env.AI_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
      key: env.AI_RATE_LIMIT_KEY,
    }),
  }));

export type AIProviderConfig = z.infer<typeof aiProviderConfigSchema>;
export type EnvConfig = z.infer<typeof envConfigSchema>;
