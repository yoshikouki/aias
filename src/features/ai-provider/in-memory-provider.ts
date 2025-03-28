import type { AIProvider, Message } from "./types";

/**
 * テスト用のインメモリAIプロバイダー
 */
export class InMemoryAIProvider implements AIProvider {
  private messages: Message[] = [];
  private responses: string[] = [];

  constructor(responses: string[] = []) {
    this.responses = [...responses];
  }

  async generateResponse(messages: Message[]): Promise<string> {
    this.messages = [...messages];
    return this.responses.shift() || "";
  }

  /**
   * 送信されたメッセージを取得
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * レスポンスを設定
   */
  setResponses(responses: string[]): void {
    this.responses = [...responses];
  }
}
