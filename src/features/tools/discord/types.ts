import type { Client } from "discord.js";
import type { Logger } from "../../../lib/logger";
import type { ChatSkill } from "../../skills/chat/types";
import type { Tool, ToolConfig } from "../types";

export interface DiscordToolConfig extends ToolConfig {
  type: "discord";
  token: string;
  logger: Logger;
}

export interface DiscordTool extends Tool<ChatSkill> {
  readonly type: "discord";
  readonly client: Client;
  readonly logger: Logger;
}
