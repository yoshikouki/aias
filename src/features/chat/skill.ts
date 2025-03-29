import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Logger } from "../../lib/logger";
import type { Message, Response } from "../agent/types";

export interface ChatSkillConfig {
  apiKey: string;
  logger: Logger;
}

export interface ChatSkill {
  handleMessage: (message: Message) => Promise<Response>;
}

export function createChatSkill(config: ChatSkillConfig): ChatSkill {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  const model = google("gemini-2.0-flash");

  async function handleMessage(message: Message): Promise<Response> {
    try {
      const result = await model.doGenerate({
        inputFormat: "prompt",
        mode: { type: "regular" },
        prompt: [{ role: "user", content: [{ type: "text", text: message.content }] }],
      });
      if (!result.text) {
        throw new Error("No text generated");
      }

      return {
        content: result.text,
        type: "text",
      };
    } catch (error) {
      config.logger.error("Error in ChatSkill:", error);
      return {
        content: "Sorry, I encountered an error while processing your message.",
        type: "error",
      };
    }
  }

  return {
    handleMessage,
  };
}
