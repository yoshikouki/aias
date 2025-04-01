import type { Skill, SkillContext, SkillResult } from "../types";

export interface MemoryOptions {
  lastMessages?: number;
  threads?: {
    generateTitle?: boolean;
  };
  semanticRecall?: {
    topK?: number;
    messageRange?: {
      before?: number;
      after?: number;
    };
  };
}

export interface MemoryContext extends SkillContext {
  resourceId: string;
  threadId: string;
  options?: MemoryOptions;
}

export interface MemoryData {
  threadId: string;
  resourceId: string;
  title?: string;
  messages: Message[];
  relatedMessages?: Message[];
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface MemoryResult extends SkillResult {
  data: MemoryData;
}

export interface MemorySkill extends Skill<MemoryContext, MemoryResult> {
  getThreadById(params: { threadId: string }): Promise<MemoryData | null>;
  createThread(params: {
    threadId: string;
    resourceId: string;
    title?: string;
  }): Promise<void>;
  addMessage(params: {
    threadId: string;
    message: Message;
  }): Promise<void>;
}
