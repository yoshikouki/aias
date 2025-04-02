import { LibSQLStore } from "@mastra/core/storage/libsql";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import { Memory } from "@mastra/memory";
import type {
  MemoryContext,
  MemoryResult,
  MemorySkill,
  Message,
  StorageMessage,
  StorageThread,
} from "./types";

export class MemorySkillImpl implements MemorySkill {
  readonly type = "memory";
  private readonly memory: Memory;
  private readonly config: {
    type: "memory";
    lastMessages: number;
    semanticRecall: {
      topK: number;
      messageRange: {
        before: number;
        after: number;
      };
    };
  };

  constructor(config: {
    type: "memory";
    lastMessages?: number;
    semanticRecall?: {
      topK?: number;
      messageRange?: {
        before?: number;
        after?: number;
      };
    };
  }) {
    this.config = {
      type: "memory",
      lastMessages: config.lastMessages || 100,
      semanticRecall: {
        topK: config.semanticRecall?.topK || 5,
        messageRange: {
          before: config.semanticRecall?.messageRange?.before || 3,
          after: config.semanticRecall?.messageRange?.after || 2,
        },
      },
    };

    // Initialize Memory
    this.memory = new Memory({
      storage: new LibSQLStore({
        config: {
          url: "file:./data/memory.db",
        },
      }),
      vector: new LibSQLVector({
        connectionUrl: "file:./data/vector.db",
      }),
      options: {
        lastMessages: this.config.lastMessages,
        semanticRecall: {
          topK: this.config.semanticRecall.topK,
          messageRange: this.config.semanticRecall.messageRange,
        },
      },
    });
  }

  private convertStorageMessageToMessage(msg: StorageMessage): Message {
    const role = msg.role === "tool" ? "system" : msg.role;
    if (role !== "user" && role !== "assistant" && role !== "system") {
      throw new Error(`Invalid role: ${role}`);
    }
    return {
      role,
      content: String(msg.content),
      timestamp: msg.createdAt,
    };
  }

  async getThreadById(params: { threadId: string }): Promise<MemoryResult["data"] | null> {
    try {
      const thread = (await this.memory.getThreadById(params)) as StorageThread | null;
      if (!thread) return null;

      return {
        threadId: thread.id,
        resourceId: thread.resourceId,
        title: thread.title,
        messages: thread.messages.map(this.convertStorageMessageToMessage),
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to get thread");
    }
  }

  async createThread(params: {
    threadId: string;
    resourceId: string;
    title?: string;
  }): Promise<void> {
    await this.memory.createThread(params);
  }

  async addMessage(params: {
    threadId: string;
    message: Message;
  }): Promise<void> {
    await this.memory.addMessage({
      threadId: params.threadId,
      type: "text",
      content: params.message.content,
      role: params.message.role === "system" ? "assistant" : params.message.role,
    });
  }

  async use(context: MemoryContext): Promise<MemoryResult> {
    try {
      const thread = (await this.memory.getThreadById({
        threadId: context.threadId,
      })) as StorageThread | null;

      if (!thread) {
        await this.memory.createThread({
          threadId: context.threadId,
          resourceId: context.resourceId,
          title: `Memory Thread: ${context.threadId}`,
        });
      }

      const result = await this.memory.query({
        threadId: context.threadId,
        selectBy: context.options?.lastMessages
          ? { last: context.options.lastMessages }
          : undefined,
      });

      const messages = (result as unknown as { messages: StorageMessage[] }).messages;

      return {
        success: true,
        data: {
          threadId: context.threadId,
          resourceId: context.resourceId,
          messages: messages.map(this.convertStorageMessageToMessage),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
        data: {
          threadId: context.threadId,
          resourceId: context.resourceId,
          messages: [],
        },
      };
    }
  }
}

export function createMemorySkill(config: {
  type: "memory";
  lastMessages?: number;
  semanticRecall?: {
    topK?: number;
    messageRange?: {
      before?: number;
      after?: number;
    };
  };
}): MemorySkill {
  return new MemorySkillImpl(config);
}
