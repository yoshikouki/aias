import { failure, success } from "../../lib/result";
import { envSchema } from "./schema";
import type { ConfigResult, EnvAdapter } from "./types";

const defaultEnvAdapter: EnvAdapter = {
  get: (key: string) => process.env[key],
};

export function loadConfig(envAdapter: EnvAdapter = defaultEnvAdapter): ConfigResult {
  const env = Object.fromEntries(
    ["GEMINI_API_KEY", "DISCORD_TOKEN"].map((key) => [key, envAdapter.get(key)]),
  );

  const result = envSchema.safeParse(env);
  if (!result.success) {
    const errors = result.error.errors;
    const message = errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return failure({
      message,
      code: "INVALID_ENV_VARS",
    });
  }

  const validatedEnv = result.data;

  return success({
    gemini: {
      apiKey: validatedEnv.GEMINI_API_KEY,
    },
    discord: {
      token: validatedEnv.DISCORD_TOKEN,
    },
  });
}
