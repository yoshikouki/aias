import type { Message, Response } from "../../agent/types";

/**
 * チャットアダプターのインターフェイス
 */
export interface ChatAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  setMessageHandler(handler: (message: Message) => Promise<Response>): void;
}
