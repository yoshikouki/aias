import type { Skill, SkillContext, SkillResult } from "../skills/types";

/**
 * エージェントの基本インターフェース
 */
export interface Agent {
  readonly id: string;
  readonly skills: ReadonlyMap<string, Skill<SkillContext, SkillResult>>;

  useSkill<T extends Skill<SkillContext, SkillResult>>(
    skillType: string,
    context: Parameters<T["use"]>[0],
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
