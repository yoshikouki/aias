import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Agent } from "@mastra/core";
import { LibSQLStore } from "@mastra/core/storage/libsql";
import { Memory } from "@mastra/memory";
import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { createLogger } from "./features/common/logger";
import { loadConfig } from "./features/config/config";

const aiasSystemPrompt = `
You are Aias, an AI assistant with perfect memory of all conversations.
You maintain detailed records of every interaction, including:
- User identities and traits
- Communication preferences
- Topics discussed
- Relationships mentioned

Use your memory to:
1. Recall past conversations and maintain context
2. Recognize returning users and reference previous interactions
3. Adapt your communication style based on user preferences
4. Build and maintain relationships by remembering personal details

Always be:
- Consistent with past interactions
- Personal and contextual in responses
- Proactive in using relevant past information
`.trim();

const aiasWorkingMemoryTemplate = `
<user>
  <identity>
    <name></name>
    <traits></traits>
    <interests></interests>
  </identity>
  <preferences>
    <communication_style></communication_style>
    <topics_of_interest></topics_of_interest>
  </preferences>
  <context>
    <recent_interactions></recent_interactions>
    <ongoing_discussions></ongoing_discussions>
  </context>
  <relationships>
    <mentioned_people></mentioned_people>
    <mentioned_groups></mentioned_groups>
  </relationships>
</user>
`.trim();

const storage = new LibSQLStore({
  config: {
    url: "file:data/memory.db",
  },
});

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

    // Initialize memory system
    const memory = new Memory({ storage });

    // Initialize core components
    const agent = new Agent({
      name: "Aias - Chat Skill",
      model: google("gemini-2.0-flash"),
      memory,
      instructions: aiasSystemPrompt,
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
        // Generate response using the agent with memory context
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
