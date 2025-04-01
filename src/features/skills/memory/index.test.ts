import { FastEmbed } from "@mastra/core/embeddings/fastembed";
import { LibSQLStore } from "@mastra/core/storage/libsql";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import type { Memory } from "@mastra/memory";
import { beforeAll, beforeEach, expect, test } from "vitest";
import { DefaultMemorySkill } from "./index";
import type { Message } from "./types";

const TEST_THREAD_ID = "test-thread";
const TEST_RESOURCE_ID = "test-resource";

interface StorageThread {
  id: string;
  resourceId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  messages: Message[];
}

// Mock Memory implementation
class MockMemory implements Memory {
  private threads: Map<string, StorageThread>;
  storage = new LibSQLStore({
    config: {
      url: "file:./data/memory.db",
    },
  });
  vector = new LibSQLVector({
    connectionUrl: "file:./data/vector.db",
  });
  embedder = new FastEmbed();
  threadConfig = {
    lastMessages: 40,
    semanticRecall: {
      topK: 2,
      messageRange: {
        before: 2,
        after: 2,
      },
    },
  };

  constructor() {
    this.threads = new Map();
  }

  async createThread({
    threadId,
    resourceId,
    title,
    metadata,
  }: {
    threadId?: string;
    resourceId: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }) {
    const id = threadId || `thread-${Date.now()}`;
    const thread = {
      id,
      resourceId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
      messages: [],
    };
    this.threads.set(id, thread);
    return thread;
  }

  async getThreadById({ threadId }: { threadId: string }) {
    return this.threads.get(threadId) || null;
  }

  async query({
    threadId,
    selectBy,
  }: {
    threadId: string;
    selectBy?: {
      last?: number;
      vectorSearchString?: string;
      include?: Array<{
        id: string;
        withPreviousMessages?: number;
        withNextMessages?: number;
      }>;
    };
  }) {
    const thread = await this.getThreadById({ threadId });
    if (!thread) return { messages: [], uiMessages: [] };

    let messages = thread.messages;
    if (selectBy?.last) {
      messages = messages.slice(-selectBy.last);
    }

    return {
      messages: messages.map((msg) => ({
        id: `msg-${Date.now()}`,
        threadId,
        type: "text",
        content: msg.content,
        role: msg.role,
        createdAt: new Date(),
      })),
      uiMessages: messages.map((msg) => ({
        id: `msg-${Date.now()}`,
        threadId,
        content: msg.content,
        role: msg.role,
        createdAt: new Date(),
      })),
    };
  }

  async addMessage({
    threadId,
    content,
    role,
    type = "text",
    config,
  }: {
    threadId: string;
    content: string;
    role: "user" | "assistant" | "system";
    type?: string;
    config?: Record<string, unknown>;
  }) {
    const thread = await this.getThreadById({ threadId });
    if (!thread) throw new Error(`Thread ${threadId} not found`);

    const message = {
      id: `msg-${Date.now()}`,
      threadId,
      type,
      content,
      role,
      createdAt: new Date(),
      config,
    };

    const storedMessage: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    thread.messages.push(storedMessage);
    thread.updatedAt = new Date();
    return message;
  }

  // Required by Memory interface but not used in tests
  async getThreadsByResourceId() {
    return [];
  }
  async clear() {
    return;
  }
  async getThreadStats() {
    return { messageCount: 0 };
  }
  async getWorkingMemoryConfig() {
    return null;
  }
  async validateThreadIsOwnedByResource() {
    return true;
  }
  async saveThread({ thread }: { thread: StorageThread }) {
    return thread;
  }
  async updateThread({
    id,
    title,
    metadata,
  }: { id: string; title?: string; metadata?: Record<string, unknown> }) {
    const thread = await this.getThreadById({ threadId: id });
    if (!thread) throw new Error(`Thread ${id} not found`);
    if (title) thread.title = title;
    if (metadata) thread.metadata = metadata;
    return thread;
  }
  async rememberMessages() {
    return { threadId: "", messages: [], uiMessages: [] };
  }
  async deleteThread() {
    return;
  }
  async deleteThreads() {
    return;
  }
  async deleteMessage() {
    return;
  }
  async deleteMessages() {
    return;
  }
  async getMessages() {
    return { messages: [], uiMessages: [] };
  }
  async getThreads() {
    return [];
  }
  async updateMessage() {
    return;
  }
  async searchThreads() {
    return { threads: [] };
  }
  async searchMessages() {
    return { messages: [], uiMessages: [] };
  }
  async getStats() {
    return { messageCount: 0, threadCount: 0 };
  }
  async summarize() {
    return { summary: "" };
  }
  async embedMessageContent() {
    return [];
  }
  async saveMessages() {
    return [];
  }
  async mutateMessagesToHideWorkingMemory() {
    return [];
  }
  parseWorkingMemory() {
    return null;
  }
  async getWorkingMemory() {
    return null;
  }
  async updateWorkingMemory() {
    return {};
  }
  async saveWorkingMemory() {
    return null;
  }
  async getSystemMessage() {
    return null;
  }
  defaultWorkingMemoryTemplate = "";
  async getWorkingMemoryWithInstruction() {
    return null;
  }
  async getWorkingMemoryFromMessages() {
    return null;
  }
  async getWorkingMemoryFromText() {
    return null;
  }
  async updateWorkingMemoryFromText() {
    return null;
  }
  async updateWorkingMemoryFromMessages() {
    return null;
  }
  async getWorkingMemoryTemplate() {
    return null;
  }
  async setWorkingMemoryTemplate() {
    return null;
  }
  async setWorkingMemoryConfig() {
    return null;
  }
  async getWorkingMemoryState() {
    return null;
  }
  async setWorkingMemoryState() {
    return null;
  }
  async clearWorkingMemory() {
    return null;
  }
  async validateWorkingMemory() {
    return null;
  }
  async validateWorkingMemoryTemplate() {
    return null;
  }
  async validateWorkingMemoryConfig() {
    return null;
  }
  async validateWorkingMemoryState() {
    return null;
  }
  getTools() {
    return {};
  }
  getWorkingMemoryToolInstruction() {
    return "";
  }
  setStorage() {
    return;
  }
  setVector() {
    return;
  }
  setEmbedder() {
    return;
  }
}

let memory: Memory;
let memorySkill: DefaultMemorySkill;

beforeAll(() => {
  memory = new MockMemory();
  memorySkill = new DefaultMemorySkill({ memory });
});

beforeEach(async () => {
  await memory.createThread({
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    title: "Test Thread",
  });
});

test("should create and retrieve a thread", async () => {
  const result = await memorySkill.getThreadById({ threadId: TEST_THREAD_ID });
  expect(result).toBeDefined();
  expect(result?.threadId).toBe(TEST_THREAD_ID);
  expect(result?.resourceId).toBe(TEST_RESOURCE_ID);
});

test("should add and retrieve messages", async () => {
  const message = {
    role: "user" as const,
    content: "Hello, world!",
  };

  await memorySkill.addMessage({
    threadId: TEST_THREAD_ID,
    message,
  });

  const result = await memorySkill.getThreadById({ threadId: TEST_THREAD_ID });
  expect(result?.messages).toHaveLength(1);
  expect(result?.messages[0].content).toBe(message.content);
  expect(result?.messages[0].role).toBe(message.role);
});

test("should skip system messages", async () => {
  const message = {
    role: "system" as const,
    content: "System message",
  };

  await memorySkill.addMessage({
    threadId: TEST_THREAD_ID,
    message,
  });

  const result = await memorySkill.getThreadById({ threadId: TEST_THREAD_ID });
  expect(result?.messages).toHaveLength(0);
});

test("should get related messages", async () => {
  const message1 = {
    role: "user" as const,
    content: "What is the weather like?",
  };
  const message2 = {
    role: "assistant" as const,
    content: "The weather is sunny!",
  };

  await memorySkill.addMessage({
    threadId: TEST_THREAD_ID,
    message: message1,
  });
  await memorySkill.addMessage({
    threadId: TEST_THREAD_ID,
    message: message2,
  });

  const now = Date.now();
  const result = await memorySkill.execute({
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    timestamp: now,
  });

  expect(result.success).toBe(true);
  expect(result.data.relatedMessages).toBeDefined();
  expect(result.data.relatedMessages?.length).toBe(2);
});
