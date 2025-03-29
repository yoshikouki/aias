import { z } from "zod";

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, { message: "Required" }),
  DISCORD_TOKEN: z.string().min(1, { message: "Required" }),
  DISCORD_CLIENT_ID: z
    .string()
    .min(1, { message: "Required" })
    .pipe(z.coerce.number({ invalid_type_error: "Expected number" }))
    .transform(String),
  DISCORD_CHANNEL_ID: z
    .string()
    .min(1, { message: "Required" })
    .pipe(z.coerce.number({ invalid_type_error: "Expected number" }))
    .transform(String),
});

export type Env = z.infer<typeof envSchema>;
