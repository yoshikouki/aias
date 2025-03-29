import { AiasAgent } from "./agent";
import { createDiscordAdapter } from "./features/chat/adapters/discord";
import { createChatSkill } from "./features/chat/skill";
import { createCodingSkill } from "./features/coding/skill";
import { logger } from "./lib/logger";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const discordToken = process.env.DISCORD_TOKEN;
  const discordClientId = process.env.DISCORD_CLIENT_ID;
  const discordChannelId = process.env.DISCORD_CHANNEL_ID;

  if (!apiKey) {
    logger.error("GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  if (!discordToken || !discordClientId || !discordChannelId) {
    logger.error("Discord environment variables are not set");
    process.exit(1);
  }

  // Initialize skills
  const codingSkill = createCodingSkill(apiKey, logger);
  const chatSkill = createChatSkill({ apiKey, logger });

  // Initialize the main agent
  const agent = new AiasAgent({
    codingSkill,
    chatSkill,
    logger,
  });

  // Initialize Discord adapter
  const discordAdapter = createDiscordAdapter({
    token: discordToken,
    clientId: discordClientId,
    channelId: discordChannelId,
    logger,
    agent,
  });

  try {
    await discordAdapter.start();
    logger.log("Discord bot is running...");
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
}

main();
