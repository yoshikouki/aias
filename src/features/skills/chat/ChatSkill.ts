import { google } from "@ai-sdk/google";
import { Agent, Mastra } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import type { MemorySkill } from "../memory/types";
import type { ChatContext, ChatResult, ChatSkill, ChatSkillConfig } from "./types";

export class ChatSkillImpl implements ChatSkill {
  readonly type = "chat";
  private agent: Agent | null = null;
  private readonly config: ChatSkillConfig;
  private readonly memorySkill: MemorySkill;

  constructor(config: ChatSkillConfig, memorySkill: MemorySkill) {
    this.config = {
      type: "chat",
      model: "gemini-2.0-flash",
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
    };
    this.memorySkill = memorySkill;
  }

  private async initAgent(): Promise<Agent> {
    if (!this.agent) {
      const mastra = new Mastra({
        logger: createLogger({ name: "aias-chat", level: "info" }),
      });

      const agent = new Agent({
        name: "Chat Agent",
        model: google("gemini-2.0-flash"),
        instructions:
          "You are a helpful AI assistant named Aias. You are knowledgeable and aim to provide accurate and helpful responses.",
      });

      this.agent = agent;
    }
    return this.agent;
  }

  async use(context: ChatContext): Promise<ChatResult> {
    try {
      const agent = await this.initAgent();

      // Get conversation history from memory
      const memoryResult = await this.memorySkill.use({
        threadId: context.metadata?.threadId as string,
        resourceId: context.metadata?.userId as string,
        timestamp: context.timestamp,
      });

      // Build prompt with conversation history
      let prompt = "";
      if (memoryResult.success && memoryResult.memories) {
        prompt = `${memoryResult.memories.map((memory) => memory.content).join("\n")}\n\n`;
      }
      prompt += context.message;

      // Generate response
      const response = await agent.generate(prompt);

      return {
        success: true,
        response: response.text,
        tokens: {
          prompt: response.usage?.promptTokens || 0,
          completion: response.usage?.completionTokens || 0,
          total: response.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  }
}

export function createChatSkill(config: ChatSkillConfig, memorySkill: MemorySkill): ChatSkill {
  return new ChatSkillImpl(config, memorySkill);
}
