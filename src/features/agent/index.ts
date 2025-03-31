import type { Logger } from "../../lib/logger";
import type { ChatAdapter } from "../chat/adapters/types";
import type { ChatSkill } from "../chat/skill";
import type { CodingSkill } from "../coding/types";
import type { Message, Response } from "./types";

interface AiasAgentConfig {
  codingSkill: CodingSkill;
  chatSkill: ChatSkill;
  logger: Logger;
}

export class AiasAgent {
  private adapters: ChatAdapter[] = [];

  constructor(private readonly config: AiasAgentConfig) {}

  /**
   * アダプターを追加する
   * 将来的には専用のコミュニケーションレイヤーに責任を移行できるよう設計
   */
  addAdapter(adapter: ChatAdapter): void {
    adapter.setMessageHandler((message) => this.handleMessage(message));
    this.adapters.push(adapter);
  }

  /**
   * すべてのアダプターを起動する
   */
  async start(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.start();
    }
    this.config.logger.log("Agent started with all adapters");
  }

  /**
   * すべてのアダプターを停止する
   */
  async stop(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.stop();
    }
    this.config.logger.log("Agent stopped all adapters");
  }

  /**
   * メッセージを処理する
   * スキルの選択とメッセージの処理を行う
   */
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
