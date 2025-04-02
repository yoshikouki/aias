import type { Skill, SkillContext, SkillResult } from "../types";

export interface ChatContext extends SkillContext {
  message: string;
  role: "user" | "assistant" | "system";
  metadata?: {
    userId?: string;
    threadId?: string;
    [key: string]: unknown;
  };
}

export interface ChatResult extends SkillResult {
  response?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ChatSkill extends Skill<ChatContext, ChatResult> {
  readonly type: "chat";
}

export interface ChatSkillConfig {
  type: "chat";
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
