import { loadConfig } from "./features/config";
import { logger } from "./lib/logger";
import { createDiscordBot } from "./mastra";

async function main() {
  const configResult = loadConfig();
  if (!configResult.ok) {
    logger.error(configResult.error.message);
    process.exit(1);
  }
  const config = configResult.result;

  // Create Discord bot with Mastra integration
  const discordBot = createDiscordBot({
    token: config.discord.token,
    logger,
  });

  try {
    // Start the Discord bot
    await discordBot.start();
    logger.log("AIAS agent is running with Discord integration...");
  } catch (error) {
    logger.error("Error starting agent:", error);
    process.exit(1);
  }
}

main();
