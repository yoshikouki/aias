import type { Logger } from "../../lib/logger";
import type { Message, Response } from "../agent/types";
import { createGenerativeAIAdapter } from "./adapters/generative-ai";
import type { CodingSkill, GenerativeAIAdapter } from "./types";

interface ChatSkillConfig {
  apiKey: string;
  logger: Logger;
  aiAdapter?: GenerativeAIAdapter;
}

export function createCodingSkill(config: ChatSkillConfig): CodingSkill {
  const aiAdapter = config.aiAdapter ?? createGenerativeAIAdapter(config.apiKey);

  return async function handleMessage(message: Message): Promise<Response> {
    try {
      const content = await aiAdapter.generateContent(message.content);
      return {
        content,
        type: "text",
      };
    } catch (error) {
      config.logger.error("Error generating code:", error);
      return {
        content: "Sorry, I encountered an error while processing your coding request.",
        type: "error",
      };
    }
  };
}
