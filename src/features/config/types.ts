interface Config {
  gemini: {
    apiKey: string;
  };
  discord: {
    token: string;
  };
}

export interface EnvAdapter {
  get: (key: string) => string | undefined;
}

export type ConfigResult =
  | {
      ok: true;
      result: {
        gemini: { apiKey: string };
        discord: { token: string };
      };
    }
  | { ok: false; error: { message: string; code: "INVALID_ENV_VARS" } };
