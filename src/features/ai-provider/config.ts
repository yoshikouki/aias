import { ConfigError } from "./errors";
import { aiProviderConfigSchema, envConfigSchema } from "./schema";

/**
 * 環境変数からAIProviderの設定を読み込む
 */
export function loadAIProviderConfig() {
  try {
    // 環境変数の検証と変換
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY or GEMINI_API_KEY is required");
    }

    const config = envConfigSchema.parse(process.env);

    // 設定値の検証
    return aiProviderConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ANTHROPIC_API_KEY or GEMINI_API_KEY is required") {
        throw new ConfigError(error.message);
      }
      throw new ConfigError(`Invalid configuration: ${error.message}`);
    }
    throw new ConfigError("Invalid configuration");
  }
}
