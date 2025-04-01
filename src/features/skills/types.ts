/**
 * スキルの基本インターフェース
 * Context: スキルの実行に必要なコンテキスト
 * Result: スキルの実行結果
 */
export interface Skill<Context, Result> {
  readonly type: string;
  use(context: Context): Promise<Result>;
}

/**
 * スキルファクトリーのインターフェース
 * 設定からスキルのインスタンスを生成
 */
export interface SkillFactory {
  create<T extends Skill<SkillContext, SkillResult>>(config: SkillConfig): Promise<T>;
}

/**
 * スキルの設定インターフェース
 */
export interface SkillConfig {
  type: string;
  [key: string]: unknown;
}

/**
 * スキルの実行結果の基本型
 */
export interface SkillResult {
  success: boolean;
  error?: Error;
}

/**
 * スキルの実行コンテキストの基本型
 */
export interface SkillContext {
  timestamp: number;
  metadata?: Record<string, unknown>;
}
