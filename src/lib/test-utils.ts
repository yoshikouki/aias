import { createInMemoryLogger, createSilentLogger } from "./logger";
import type { Logger } from "./logger";

/**
 * テスト用にロガーをモックするユーティリティ
 */
export const createMockLogger = (): Logger & {
  logs: string[];
  errors: string[];
  warnings: string[];
  clear: () => void;
} => {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  return {
    logs,
    errors,
    warnings,
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
    warn(message: string, warning?: unknown): void {
      if (warning) {
        warnings.push(
          `${message} ${warning instanceof Error ? warning.message : String(warning)}`,
        );
      } else {
        warnings.push(message);
      }
    },
    clear(): void {
      logs.length = 0;
      errors.length = 0;
      warnings.length = 0;
    },
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
