import { CodingAgent } from './agent';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    process.exit(1);
  }

  const agent = new CodingAgent(apiKey);
  
  console.log('Enter your task:');
  const task = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });

  try {
    await agent.start(task);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 