import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Agent } from "@mastra/core";
import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { createLogger } from "./features/common/logger";
import { loadConfig } from "./features/config/config";

// Initialize logger first for error reporting
const logger = createLogger();

// Start the client
async function main() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    if (!config.ok) {
      throw new Error(`Configuration error: ${config.error.message}`);
    }
    const google = createGoogleGenerativeAI({
      apiKey: config.result.gemini.apiKey,
    });

    // Initialize core components
    const agent = new Agent({
      name: "Aias - Chat Skill",
      model: google("gemini-2.0-flash"),
      instructions:
        "You are a helpful AI assistant named Aias. You are knowledgeable and aim to provide accurate and helpful responses.",
    });

    // Initialize Discord client
    const discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    // Set up event handlers
    discordClient.on(Events.ClientReady, () => {
      logger.log("Discord client is ready!");
    });

    discordClient.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots (including self)
      if (message.author.bot) return;

      try {
        // Generate response using the agent
        const response = await agent.generate(message.content);

        // Send response back to Discord
        const channel = await discordClient.channels.fetch(message.channelId);
        if (!channel || !(channel instanceof TextChannel)) {
          throw new Error("Invalid channel or not a text channel");
        }
        await channel.send(response.text);
      } catch (error) {
        logger.error(`Error processing message: ${error}`);
        await message.reply(`I'm sorry, I couldn't process that message.\n\n[Error]\n${error}`);
      }
    });

    // Log in to Discord
    await discordClient.login(config.result.discord.token);
    logger.log("Discord client started");
  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main();
