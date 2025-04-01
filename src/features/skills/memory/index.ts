import type { Memory } from "@mastra/memory";
import type { MemoryContext, MemoryData, MemoryResult, MemorySkill, Message } from "./types";

interface MemorySkillConfig {
  memory: Memory;
}

interface StorageMessage {
  role: string;
  content: unknown;
}

interface StorageThread {
  id: string;
  resourceId: string;
  title?: string;
  messages: StorageMessage[];
}

export class DefaultMemorySkill implements MemorySkill {
  readonly type = "memory";
  private memory: Memory;

  constructor(config: MemorySkillConfig) {
    this.memory = config.memory;
  }

  async use(context: MemoryContext): Promise<MemoryResult> {
    return this.execute(context);
  }

  async execute(context: MemoryContext): Promise<MemoryResult> {
    const { threadId, resourceId, options } = context;

    try {
      // Get or create thread
      let thread = await this.getThreadById({ threadId });
      if (!thread) {
        await this.createThread({ threadId, resourceId });
        thread = {
          threadId,
          resourceId,
          messages: [],
        };
      }

      // Get related messages if semantic recall is enabled
      let relatedMessages: Message[] = [];
      if (options?.semanticRecall) {
        const { topK = 5 } = options.semanticRecall;
        const result = await this.memory.query({
          threadId,
          selectBy: {
            last: topK,
          },
        });
        relatedMessages = result.messages
          .filter((msg: StorageMessage) => {
            return (
              (msg.role === "user" || msg.role === "assistant") &&
              typeof msg.content === "string"
            );
          })
          .map((msg: StorageMessage) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content as string,
            timestamp: new Date(),
          }));
      }

      return {
        success: true,
        data: {
          ...thread,
          relatedMessages,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
        data: {
          threadId,
          resourceId,
          messages: [],
          relatedMessages: [],
        },
      };
    }
  }

  async getThreadById({ threadId }: { threadId: string }): Promise<MemoryData | null> {
    try {
      const thread = (await this.memory.getThreadById({ threadId })) as StorageThread | null;
      if (!thread) return null;

      const messages = thread.messages
        ? thread.messages
            .filter((msg: StorageMessage) => {
              return (
                (msg.role === "user" || msg.role === "assistant") &&
                typeof msg.content === "string"
              );
            })
            .map((msg: StorageMessage) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content as string,
              timestamp: new Date(),
            }))
        : [];

      return {
        threadId: thread.id,
        resourceId: thread.resourceId,
        title: thread.title,
        messages,
      };
    } catch (error) {
      return null;
    }
  }

  async createThread({
    threadId,
    resourceId,
    title,
  }: {
    threadId: string;
    resourceId: string;
    title?: string;
  }): Promise<void> {
    await this.memory.createThread({
      threadId,
      resourceId,
      title,
    });
  }

  async addMessage({
    threadId,
    message,
  }: {
    threadId: string;
    message: Message;
  }): Promise<void> {
    if (message.role === "system") {
      // Skip system messages as they are not supported by Mastra memory
      return;
    }

    await this.memory.addMessage({
      threadId,
      type: "text",
      content: message.content,
      role: message.role,
    });
  }
}
