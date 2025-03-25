import { CodingAgent } from "./agent";
import { logger } from "./lib/logger";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const agent = CodingAgent.fromGoogleApiKey(apiKey);

  logger.log("Enter your task:");
  const task = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });

  try {
    await agent.start(task);
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
}

main();
