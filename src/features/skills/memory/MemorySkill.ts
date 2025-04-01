import { LibSQLStore } from "@mastra/core/storage/libsql";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import { Memory } from "@mastra/memory";
import type { MemoryContext, MemoryResult, MemorySkill, MemorySkillConfig } from "./types";

export class MemorySkillImpl implements MemorySkill {
  readonly type = "memory";
  private readonly memory: Memory;
  private readonly config: MemorySkillConfig;

  constructor(config: MemorySkillConfig) {
    this.config = {
      type: "memory",
      lastMessages: config.lastMessages || 100,
      semanticRecall: config.semanticRecall || {
        topK: 5,
        messageRange: {
          before: 3,
          after: 2,
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
          topK: this.config.semanticRecall?.topK || 5,
          messageRange: this.config.semanticRecall?.messageRange || {
            before: 3,
            after: 2,
          },
        },
      },
    });
  }

  async use(context: MemoryContext): Promise<MemoryResult> {
    try {
      const thread = await this.memory.getThreadById({
        threadId: context.threadId,
      });

      if (!thread) {
        await this.memory.createThread({
          threadId: context.threadId,
          resourceId: context.resourceId,
          title: `Memory Thread: ${context.threadId}`,
        });
      }

      if (context.query) {
        const { uiMessages } = await this.memory.query({
          threadId: context.threadId,
          selectBy: {
            vectorSearchString: context.query,
            last: this.config.semanticRecall?.topK || 5,
          },
        });

        return {
          success: true,
          memories: uiMessages.map((message) => ({
            id: message.id,
            content: message.content,
            timestamp: Date.now(),
            metadata: {},
          })),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  }
}

export function createMemorySkill(config: MemorySkillConfig): MemorySkill {
  return new MemorySkillImpl(config);
}
