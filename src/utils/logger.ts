/**
 * Simple logger utility for AIAS
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

class SimpleLogger implements Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] ${levelUpper} ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env['NODE_ENV'] === 'development' || process.env['DEBUG']) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger: Logger = new SimpleLogger();