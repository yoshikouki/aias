import { ConfigError } from "./errors";
import { aiProviderConfigSchema, envConfigSchema } from "./schema";

/**
 * 環境変数からAIProviderの設定を読み込む
 */
export function loadAIProviderConfig() {
  try {
    // 環境変数の検証と変換
    const config = envConfigSchema.parse(process.env);

    // 設定値の検証
    return aiProviderConfigSchema.parse(config);
  } catch (error) {
    throw new ConfigError(error instanceof Error ? error.message : "Invalid configuration");
  }
}
