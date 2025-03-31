import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Logger } from "../../../lib/logger";
import type { Message as AiasMessage, Response } from "../../agent/types";
import type { ChatAdapter } from "./types";

interface DiscordAdapterConfig {
  token: string;
  logger: Logger;
}

export function createDiscordAdapter(config: DiscordAdapterConfig): ChatAdapter {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  let messageHandler: ((message: AiasMessage) => Promise<Response>) | null = null;

  client.on(Events.ClientReady, () => {
    config.logger.log("Discord client is ready!");
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (!messageHandler) {
      config.logger.error("Message handler not set");
      return;
    }

    try {
      const response = await messageHandler({
        content: message.content,
        role: "user",
      });

      if (response.type === "error") {
        await message.reply(response.content);
        return;
      }

      await message.reply(response.content);
    } catch (error) {
      config.logger.error("Error handling message:", error);
      await message.reply("Sorry, I encountered an error while processing your message.");
    }
  });

  return {
    async start() {
      await client.login(config.token);
    },
    async stop() {
      await client.destroy();
    },
    setMessageHandler(handler) {
      messageHandler = handler;
    },
  };
}
