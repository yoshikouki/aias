import { Client, Events, GatewayIntentBits } from "discord.js";
import type { ChatContext, ChatSkill } from "../../skills/chat/types";
import type { DiscordTool, DiscordToolConfig } from "./types";

export class DiscordToolImpl implements DiscordTool {
  readonly type = "discord";
  readonly client: Client;
  readonly logger: DiscordToolConfig["logger"];
  private readonly token: string;

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
  }

  async execute(skill: ChatSkill, context: ChatContext): Promise<void> {
    const result = await skill.use(context);
    if (!result.success || !result.response) {
      throw new Error("Failed to generate response");
    }

    // TODO: Implement message handling
    this.logger.log(`Generated response: ${result.response}`);
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
