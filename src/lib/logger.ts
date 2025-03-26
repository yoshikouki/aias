/**
 * ロガーインターフェース
 */
export interface Logger {
  log(message: string): void;
  error(message: string, error?: unknown): void;
}

/**
 * デフォルトのコンソールロガー実装
 */
export const createConsoleLogger = (): Logger => ({
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
});

/**
 * テスト用のサイレントロガー実装
 */
export const createSilentLogger = (): Logger => ({
  log(_message: string): void {
    // ログ出力しない
  },
  error(_message: string, _error?: unknown): void {
    // エラーログ出力しない
  },
});

/**
 * テスト用のインメモリロガー実装
 */
export const createInMemoryLogger = (): Logger & {
  messages: string[];
  errors: Array<{ message: string; error?: unknown }>;
} => {
  const messages: string[] = [];
  const errors: Array<{ message: string; error?: unknown }> = [];

  return {
    messages,
    errors,
    log(message: string): void {
      messages.push(message);
    },
    error(message: string, error?: unknown): void {
      errors.push({ message, error });
    },
  };
};

// デフォルトのロガーをエクスポート
export const logger = createConsoleLogger();
