import { createLogger } from "./features/common/logger";
import { createChatSkill } from "./features/skills/chat/ChatSkill";
import { createMemorySkill } from "./features/skills/memory/MemorySkill";
import { createDiscordTool } from "./features/tools/discord";

// Export core types and utility functions
export * from "./features/common/logger";
export * from "./features/skills/chat/types";
export * from "./features/skills/memory/types";
export * from "./features/tools/discord/types";

async function main() {
  const logger = createLogger();

  // Initialize memory skill
  const memorySkill = createMemorySkill({
    type: "memory",
    lastMessages: 100,
    semanticRecall: {
      topK: 5,
      messageRange: {
        before: 3,
        after: 2,
      },
    },
  });

  // Initialize chat skill with memory
  const chatSkill = createChatSkill(
    {
      type: "chat",
      model: "gemini-2.0-flash",
      temperature: 0.7,
      maxTokens: 2048,
    },
    memorySkill,
  );

  // Initialize Discord tool
  const discordTool = createDiscordTool({
    type: "discord",
    token: process.env.DISCORD_TOKEN || "",
    logger,
  });

  // Connect chat skill to Discord tool and start
  await discordTool.execute(chatSkill, {
    message: "I'm now online and ready to help!",
    role: "assistant",
    timestamp: Date.now(),
    metadata: {
      threadId: process.env.DISCORD_CHANNEL_ID,
      userId: "system",
    },
  });

  await discordTool.start();
  logger.log("Discord tool started and connected with chat skill");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
