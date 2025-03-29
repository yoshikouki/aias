import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GenerativeAIAdapter } from "../types";

export function createGenerativeAIAdapter(apiKey: string): GenerativeAIAdapter {
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google("gemini-2.0-flash");

  return {
    async generateContent(content: string): Promise<string> {
      const result = await model.doGenerate({
        inputFormat: "prompt",
        mode: { type: "regular" },
        prompt: [{ role: "user", content: [{ type: "text", text: content }] }],
      });
      if (!result.text) {
        throw new Error("No text generated");
      }
      return result.text;
    },
  };
}
