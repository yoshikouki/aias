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

/**
 * テスト用のサイレントロガー実装
 */
const createSilentLogger = (): Logger => ({
  log(_message: string): void {
    // ログ出力しない
  },
  error(_message: string, _error?: unknown): void {
    // エラーログ出力しない
  },
  warn(_message: string, _warning?: unknown): void {
    // 警告ログ出力しない
  },
});

/**
 * テスト用のインメモリロガー実装
 */
const createInMemoryLogger = (): Logger & {
  messages: string[];
  errors: Array<{ message: string; error?: unknown }>;
  warnings: Array<{ message: string; warning?: unknown }>;
} => {
  const messages: string[] = [];
  const errors: Array<{ message: string; error?: unknown }> = [];
  const warnings: Array<{ message: string; warning?: unknown }> = [];

  return {
    messages,
    errors,
    warnings,
    log(message: string): void {
      messages.push(message);
    },
    error(message: string, error?: unknown): void {
      errors.push({ message, error });
    },
    warn(message: string, warning?: unknown): void {
      warnings.push({ message, warning });
    },
  };
};

// デフォルトのロガーをエクスポート
export const logger = createConsoleLogger();
