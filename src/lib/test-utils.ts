import { SilentLogger } from "./logger";
import type { Logger } from "./logger";

/**
 * テスト用にロガーをモックするクラス
 */
export class MockLogger implements Logger {
  public logs: string[] = [];
  public errors: string[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: string, error?: unknown): void {
    if (error) {
      this.errors.push(`${message} ${error instanceof Error ? error.message : String(error)}`);
    } else {
      this.errors.push(message);
    }
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
  }
}

/**
 * テスト用にロガーを差し替える
 * @param mockLogger - 使用するモックロガー（指定がなければSilentLoggerを使用）
 */
export function setupTestLogger(mockLogger: Logger = new SilentLogger()): Logger {
  const originalLogger = require("./logger").logger;

  // ロガーのシングルトンインスタンスを差し替え
  // @ts-ignore - プロパティ書き換え
  require("./logger").logger = mockLogger;

  // 元のロガーを返すクリーンアップ関数
  return originalLogger;
}

/**
 * テスト用にロガーをリセットする
 * @param originalLogger - 元のロガー
 */
export function resetTestLogger(originalLogger: Logger): void {
  // @ts-ignore - プロパティ書き換え
  require("./logger").logger = originalLogger;
}
