import { CodingAgent } from "./agent";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const agent = CodingAgent.fromGoogleApiKey(apiKey);

  console.log("Enter your task:");
  const task = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });

  try {
    await agent.start(task);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
