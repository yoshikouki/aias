import type { Logger } from "../../../lib/logger";
import type { Message, Response } from "../../agent/types";

/**
 * チャットアダプターのインターフェイス
 */
export interface ChatAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  setMessageHandler(handler: (message: Message) => Promise<Response>): void;
}

/**
 * チャットアダプターの設定
 */
export interface ChatAdapterConfig {
  // 共通の設定を定義
  logger: Logger;
}

/**
 * チャットアダプターのファクトリ関数の型
 */
export type CreateChatAdapter = (config: ChatAdapterConfig) => ChatAdapter;
