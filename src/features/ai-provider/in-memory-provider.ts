import type { AIProvider, Message } from "./types";

/**
 * テスト用のインメモリAIプロバイダー
 */
export class InMemoryAIProvider implements AIProvider {
  private messages: Message[] = [];
  private responses: string[] = [];
  private error: Error | null = null;

  constructor(responses: string[] = []) {
    this.responses = [...responses];
  }

  async generateResponse(messages: Message[]): Promise<string> {
    this.messages = [...messages];
    if (this.error) {
      throw this.error;
    }
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

  /**
   * エラーを設定
   */
  setError(error: Error): void {
    this.error = error;
  }

  /**
   * 状態をクリア
   */
  clear(): void {
    this.messages = [];
    this.responses = [];
    this.error = null;
  }
}
