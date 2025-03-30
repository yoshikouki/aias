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

  // Add adapter to agent
  agent.addAdapter(discordAdapter);

  try {
    // Start the agent with all adapters
    await agent.start();
    logger.log("AIAS agent is running with all adapters...");
  } catch (error) {
    logger.error("Error starting agent:", error);
    process.exit(1);
  }
}

main();
