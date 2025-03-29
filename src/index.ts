import { AiasAgent } from "./features/agent";
import { createDiscordAdapter } from "./features/chat/adapters/discord";
import { createChatSkill } from "./features/chat/skill";
import { createCodingSkill } from "./features/coding/skill";
import { loadConfig } from "./features/config";
import { logger } from "./lib/logger";

async function main() {
  const configResult = loadConfig();
  if (!configResult.ok) {
    logger.error(configResult.error.message);
    process.exit(1);
  }
  const config = configResult.result;

  // Initialize skills
  const codingSkill = createCodingSkill({ apiKey: config.gemini.apiKey, logger });
  const chatSkill = createChatSkill({ apiKey: config.gemini.apiKey, logger });

  // Initialize the main agent
  const agent = new AiasAgent({
    codingSkill,
    chatSkill,
    logger,
  });

  // Initialize Discord adapter
  const discordAdapter = createDiscordAdapter({
    token: config.discord.token,
    logger,
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
