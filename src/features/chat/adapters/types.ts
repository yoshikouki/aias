import type { AiasAgent, Message, Response } from "../../../agent";
import type { Logger } from "../../../lib/logger";

/**
 * チャットアダプターのインターフェイス
 */
export interface ChatAdapter {
  handleMessage(message: Message): Promise<Response>;
  start(): Promise<void>;
}

/**
 * チャットアダプターの設定
 */
export interface ChatAdapterConfig {
  // 共通の設定を定義
  logger: Logger;
  agent: AiasAgent;
}

/**
 * チャットアダプターのファクトリ関数の型
 */
export type CreateChatAdapter = (config: ChatAdapterConfig) => ChatAdapter;
