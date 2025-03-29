import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Message, Response } from "../../agent";
import type { Logger } from "../../lib/logger";

// 抽象化されたインターフェイス
type GenerativeAIAdapter = {
  generateContent: (content: string) => Promise<string>;
};

// 実装
function createGenerativeAIAdapter(apiKey: string): GenerativeAIAdapter {
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

// メインの関数
export type CodingSkill = (message: Message) => Promise<Response>;

export function createCodingSkill(
  apiKey: string,
  logger: Logger,
  aiAdapter: GenerativeAIAdapter = createGenerativeAIAdapter(apiKey),
): CodingSkill {
  return async function handleMessage(message: Message): Promise<Response> {
    try {
      const text = await aiAdapter.generateContent(message.content);
      return {
        content: text,
        type: "text",
      };
    } catch (error) {
      logger.error("Error in CodingSkill:", error);
      return {
        content: "Sorry, I encountered an error while processing your coding request.",
        type: "error",
      };
    }
  };
}
