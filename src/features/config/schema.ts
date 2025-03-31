import { z } from "zod";

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, { message: "Required" }),
  DISCORD_TOKEN: z.string().min(1, { message: "Required" }),
});
