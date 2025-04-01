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
  const discordTool = createDiscordTool({
    type: "discord",
    token: process.env.DISCORD_TOKEN || "",
    logger,
  });

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

  const chatSkill = createChatSkill(
    {
      type: "chat",
      model: "gemini-2.0-flash",
      temperature: 0.7,
      maxTokens: 2048,
    },
    memorySkill,
  );

  await discordTool.start();
  logger.log("Discord tool started");

  const message = "Hello, how can I help you today?";
  const result = await chatSkill.use({
    message,
    role: "assistant",
    timestamp: Date.now(),
    metadata: {
      threadId: "test-thread",
      userId: "test-resource",
    },
  });

  if (result.success) {
    logger.log(`Chat response: ${result.response}`);
  } else {
    logger.error(`Chat error: ${result.error}`);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
