import type { Logger } from "../../lib/logger";
import type { ChatSkill } from "../chat/skill";
import type { CodingSkill } from "../coding/types";
import type { Message, Response } from "./types";

export interface AiasAgentConfig {
  codingSkill: CodingSkill;
  chatSkill: ChatSkill;
  logger: Logger;
}

export class AiasAgent {
  constructor(private readonly config: AiasAgentConfig) {}

  async handleMessage(message: Message): Promise<Response> {
    try {
      // TODO: Implement skill selection logic based on message content
      // For now, we'll just use the chat skill
      return await this.config.chatSkill.handleMessage(message);
    } catch (error) {
      this.config.logger.error("Error handling message:", error);
      return {
        content: "Sorry, I encountered an error while processing your message.",
        type: "error",
      };
    }
  }
}
