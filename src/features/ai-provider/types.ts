import type { RateLimitConfig } from "../rate-limit/types";

/**
 * AIプロバイダーのインターフェイス
 */
export interface AIProvider {
  generateResponse(messages: Message[]): Promise<string>;
}

/**
 * メッセージの型定義
 */
export type Role = "user" | "assistant";
export interface Message {
  role: Role;
  content: string;
}

/**
 * AIProviderの設定
 */
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  rateLimit?: RateLimitConfig;
  rateLimitKey?: string;
}
