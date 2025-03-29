import { createCodingSkill } from "./features/coding/skill";
import { logger } from "./lib/logger";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }


  logger.log("Enter your task:");
  const task = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  // Initialize skills
  const codingSkill = createCodingSkill(apiKey, logger);
  // Initialize the main agent
  const agent = new AiasAgent({
    codingSkill,
    logger,
  });

  try {
    await agent.start(task);
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
}

main();
