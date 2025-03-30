import type { Logger } from "./logger";

export class InMemoryLogger implements Logger {
  private logs: string[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
  }
}
