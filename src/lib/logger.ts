/**
 * ロガーインターフェース
 */
export interface Logger {
  log(message: string): void;
  error(message: string, error?: unknown): void;
  warn(message: string, warning?: unknown): void;
}

/**
 * デフォルトのコンソールロガー実装
 */
const createConsoleLogger = (): Logger => ({
  log(message: string): void {
    console.log(message);
  },
  error(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error instanceof Error ? error.message : String(error));
    } else {
      console.error(message);
    }
  },
  warn(message: string, warning?: unknown): void {
    if (warning) {
      console.warn(message, warning instanceof Error ? warning.message : String(warning));
    } else {
      console.warn(message);
    }
  },
});

// デフォルトのロガーをエクスポート
export const logger = createConsoleLogger();
