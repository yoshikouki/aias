import type { Skill } from "../skills/types";

/**
 * エージェントの基本インターフェース
 */
export interface Agent {
  readonly id: string;
  readonly skills: ReadonlyMap<string, Skill<any, any>>;
  
  useSkill<T extends Skill<any, any>>(
    skillType: string,
    context: Parameters<T["use"]>[0]
  ): Promise<ReturnType<T["use"]>>;
}

/**
 * エージェントの設定インターフェース
 */
export interface AgentConfig {
  id: string;
  skills: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

/**
 * エージェントファクトリーのインターフェース
 */
export interface AgentFactory {
  create(config: AgentConfig): Promise<Agent>;
}