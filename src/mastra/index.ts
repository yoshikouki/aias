import { Mastra } from "@mastra/core";
import type { Agent } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Logger } from "../lib/logger";
import { chatAgent } from "./agents/chat";

interface DiscordConfig {
  token: string;
  logger: Logger;
}

interface Memory {
  getThreadById: (params: { threadId: string }) => Promise<unknown>;
  createThread: (params: {
    threadId: string;
    resourceId: string;
    title: string;
  }) => Promise<void>;
}

interface ChatAgent extends Agent {
  memory: Memory;
}

// グローバル定数
const MAIN_THREAD_ID = "aias-main-memory";
const MAIN_RESOURCE_ID = "aias-memory";

// Mastra のロガーを設定
const mastraLogger = createLogger({
  name: "Aias",
  level: "debug", // より詳細なログを出力
});

export const mastra = new Mastra({
  agents: { chatAgent },
  logger: mastraLogger,
});

export function createDiscordBot(config: DiscordConfig) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on(Events.ClientReady, async () => {
    config.logger.log("Discord client is ready!");

    // メインスレッドの初期化を確認
    const agent = (await mastra.getAgent("chatAgent")) as ChatAgent;
    const memory = agent.memory;
    if (memory) {
      try {
        const thread = await memory.getThreadById({ threadId: MAIN_THREAD_ID });
        if (!thread) {
          // スレッドが存在しない場合は作成
          await memory.createThread({
            threadId: MAIN_THREAD_ID,
            resourceId: MAIN_RESOURCE_ID,
            title: "Aias Global Memory",
          });
          config.logger.log("Created main memory thread");
        }
      } catch (error) {
        config.logger.error("Error initializing memory thread:", error);
      }
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    try {
      const agent = (await mastra.getAgent("chatAgent")) as ChatAgent;

      // メッセージを生成（共有スレッドを使用）
      const response = await agent.generate(
        [
          {
            role: "user",
            content: message.content,
          },
        ],
        {
          resourceId: MAIN_RESOURCE_ID,
          threadId: MAIN_THREAD_ID,
          memoryOptions: {
            lastMessages: 100,
            threads: {
              generateTitle: false,
            },
          },
        },
      );

      // レスポンスを整形して送信
      const reply = response.text.replace(/\[Assistant\]:\s*/g, "");
      if (!reply.trim()) {
        config.logger.error("Empty response received from agent");
        await message.reply("申し訳ありません。適切な応答を生成できませんでした。");
        return;
      }
      await message.reply(reply);
    } catch (error) {
      config.logger.error("Error handling message:", error);
      await message.reply("申し訳ありません。メッセージの処理中にエラーが発生しました。");
    }
  });

  return {
    async start() {
      await client.login(config.token);
    },
    async stop() {
      await client.destroy();
    },
  };
}
