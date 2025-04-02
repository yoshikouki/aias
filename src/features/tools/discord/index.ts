import { Client, Events, GatewayIntentBits, type Message, TextChannel } from "discord.js";
import type { ChatContext, ChatSkill } from "../../skills/chat/types";
import type { DiscordTool, DiscordToolConfig } from "./types";

export class DiscordToolImpl implements DiscordTool {
  readonly type = "discord";
  readonly client: Client;
  readonly logger: DiscordToolConfig["logger"];
  private readonly token: string;
  private chatSkill?: ChatSkill;

  constructor(config: DiscordToolConfig) {
    this.logger = config.logger;
    this.token = config.token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on(Events.ClientReady, () => {
      this.logger.log("Discord client is ready!");
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore messages from bots (including self)
      if (message.author.bot) return;

      try {
        if (!this.chatSkill) {
          this.logger.error("ChatSkill not set");
          return;
        }

        await this.execute(this.chatSkill, {
          message: message.content,
          role: "user",
          timestamp: Date.now(),
          metadata: {
            threadId: message.channelId,
            userId: message.author.id,
          },
        });

        // If execution was successful, add a reaction to indicate processing
        await message.react("✅");
      } catch (error) {
        this.logger.error(`Error processing message: ${error}`);
        await message.react("❌");
      }
    });
  }

  async execute(skill: ChatSkill, context: ChatContext): Promise<void> {
    this.chatSkill = skill; // Store the skill for future message handling
    const result = await skill.use(context);
    if (!result.success || !result.response) {
      throw new Error("Failed to generate response");
    }

    if (!context.metadata?.threadId) {
      throw new Error("Thread ID is required");
    }

    const channel = await this.client.channels.fetch(context.metadata.threadId);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new Error("Invalid channel or not a text channel");
    }

    await channel.send(result.response);
  }

  async start(): Promise<void> {
    await this.client.login(this.token);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }
}

export function createDiscordTool(config: DiscordToolConfig): DiscordTool {
  return new DiscordToolImpl(config);
}
