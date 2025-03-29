import {
  Client,
  type Message as DiscordMessage,
  Events,
  GatewayIntentBits,
  type TextChannel,
} from "discord.js";
import type { Message, Response } from "../../../agent";
import type { ChatAdapter, ChatAdapterConfig } from "./types";

interface DiscordAdapterConfig extends ChatAdapterConfig {
  token: string;
  clientId: string;
  channelId: string;
}

export function createDiscordAdapter(config: DiscordAdapterConfig): ChatAdapter {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  async function handleMessage(message: Message): Promise<Response> {
    try {
      // Discordクライアントが準備できていない場合はエラー
      if (!client.isReady()) {
        throw new Error("Discord client is not ready");
      }

      // メッセージを送信
      if (!message.channelId) {
        throw new Error("Channel ID is required");
      }

      const channel = await client.channels.fetch(message.channelId);
      if (!channel?.isTextBased()) {
        throw new Error("Channel is not text-based");
      }

      await (channel as TextChannel).send(message.content);
      return {
        content: "Message sent successfully",
        type: "text",
      };
    } catch (error) {
      config.logger.error("Error in Discord adapter:", error);
      return {
        content: "Failed to send message to Discord",
        type: "error",
      };
    }
  }

  // クライアントの初期化とイベントハンドリング
  client.on(Events.ClientReady, () => {
    config.logger.log(`Logged in as ${client.user?.tag}`);
  });

  // メッセージ受信のハンドリング
  client.on(Events.MessageCreate, async (message: DiscordMessage) => {
    if (message.author.bot || message.channelId !== config.channelId) {
      return;
    }

    try {
      const agentMessage: Message = {
        content: message.content,
        role: "user",
        userId: message.author.id,
        channelId: message.channelId,
      };

      const response = await config.agent.handleMessage(agentMessage);
      await message.reply(response.content);
    } catch (error) {
      config.logger.error("Error handling Discord message:", error);
      await message.reply("Sorry, I encountered an error while processing your message.");
    }
  });

  async function start(): Promise<void> {
    try {
      await client.login(config.token);
    } catch (error) {
      config.logger.error("Failed to login to Discord:", error);
      throw error;
    }
  }

  return {
    handleMessage,
    start,
  };
}
