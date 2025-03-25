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
export class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error instanceof Error ? error.message : String(error));
    } else {
      console.error(message);
    }
  }
}

/**
 * テスト用のサイレントロガー実装
 */
export class SilentLogger implements Logger {
  log(_message: string): void {
    // ログ出力しない
  }

  error(_message: string, _error?: unknown): void {
    // エラーログ出力しない
  }
}

/**
 * デフォルトロガーのシングルトンインスタンス
 */
export const logger: Logger = new ConsoleLogger();
