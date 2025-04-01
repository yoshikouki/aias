import type { Logger } from "../common/logger";
import type { Skill, SkillContext, SkillResult } from "../skills/types";

/**
 * ツールの基本インターフェース
 * S: 実行対象のスキルの型
 */
export interface Tool<S extends Skill<SkillContext, SkillResult>> {
  readonly type: string;
  readonly logger: Logger;
  execute(skill: S, context: Parameters<S["use"]>[0]): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * ツールファクトリーのインターフェース
 */
export interface ToolFactory {
  create<T extends Tool<any>>(config: ToolConfig): Promise<T>;
}

/**
 * ツールの設定インターフェース
 */
export interface ToolConfig {
  type: string;
  logger: Logger;
}

/**
 * ツールの実行結果の基本型
 */
export interface ToolResult {
  success: boolean;
  error?: Error;
}
