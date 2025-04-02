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

// --- Adapter Related Types (Moved from index.test.ts) ---

// Memoryから返されるメッセージの型
export interface StorageMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  createdAt: Date;
}

// Memoryから返されるスレッドの型
export interface StorageThread {
  id: string;
  resourceId: string;
  title?: string;
  messages: StorageMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// DefaultMemorySkillが必要とするMemoryの機能に絞ったインターフェイス
export interface MemoryAdapter {
  getThreadById(params: { threadId: string }): Promise<StorageThread | null>;
  createThread(params: {
    threadId: string;
    resourceId: string;
    title?: string;
  }): Promise<void>;
  query(params: {
    threadId: string;
    selectBy?: { last?: number };
  }): Promise<{ messages: StorageMessage[] }>;
  addMessage(params: {
    threadId: string;
    type: string;
    content: unknown;
    role: string;
  }): Promise<void>;
}

// --- Original Interfaces ---

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
