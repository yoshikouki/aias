import { createSilentLogger, createInMemoryLogger } from "./logger";
import type { Logger } from "./logger";

/**
 * テスト用にロガーをモックするユーティリティ
 */
export const createMockLogger = (): Logger & { logs: string[], errors: string[], clear: () => void } => {
  const logs: string[] = [];
  const errors: string[] = [];

  return {
    logs,
    errors,
    log(message: string): void {
      logs.push(message);
    },
    error(message: string, error?: unknown): void {
      if (error) {
        errors.push(`${message} ${error instanceof Error ? error.message : String(error)}`);
      } else {
        errors.push(message);
      }
    },
    clear(): void {
      logs.length = 0;
      errors.length = 0;
    }
  };
};

/**
 * テスト用のロガーを取得する
 * @returns テスト用のモックロガー
 */
export function getTestLogger(): Logger {
  return createSilentLogger();
}

/**
 * テスト用のインメモリロガーを取得する
 * @returns ログを記録するインメモリロガー
 */
export function getInMemoryLogger() {
  return createInMemoryLogger();
}
