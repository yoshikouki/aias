import { z } from "zod";

/**
 * AIProviderの設定スキーマ
 */
export const aiProviderConfigSchema = z.object({
  anthropicApiKey: z.string().min(1, "Anthropic API key is required"),
  geminiApiKey: z.string().min(1, "Gemini API key is required"),
});

/**
 * 環境変数から設定を読み込むためのスキーマ
 */
export const envConfigSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  })
  .transform((env) => ({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
  }));
