/**
 * AIAS - AI Assistant with Memory and Autonomous Actions
 * Entry point for the application
 */

// Load environment variables from .env file
import 'dotenv/config';

import { logger } from './utils/logger.js';
import { loadConfig } from './core/config.js';
import { ChatAgent } from './agents/chat-agent.js';
import { DiscordBot } from './platforms/discord/bot.js';
import { AutonomousSystem } from './autonomous/index.js';

// Global instances
let chatAgent: ChatAgent | null = null;
let discordBot: DiscordBot | null = null;
let autonomousSystem: AutonomousSystem | null = null;

async function main(): Promise<void> {
  logger.info('🚀 AIAS Starting...');
  
  // Load configuration
  logger.info('📋 Loading configuration...');
  const configResult = loadConfig();
  if (!configResult.success) {
    throw new Error(`Configuration error: ${configResult.error}`);
  }
  const config = configResult.config;
  logger.info(`✅ Configuration loaded (env: ${config.app.nodeEnv})`);
  
  // Initialize chat agent with memory
  logger.info('🧠 Initializing Chat Agent...');
  chatAgent = new ChatAgent(config);
  await chatAgent.initialize();
  logger.info('✅ Chat Agent initialized');
  
  // Initialize autonomous system with advanced features
  logger.info('🤖 Initializing Autonomous System...');
  autonomousSystem = new AutonomousSystem(chatAgent, {
    enabled: true,
    schedulerEnabled: true,
    triggersEnabled: true,
    defaultTasks: true,
    defaultTriggers: true,
    advancedActionsEnabled: true,
    rssMonitoringEnabled: true,
  }, config.database.path);
  await autonomousSystem.initialize();
  autonomousSystem.start();
  logger.info('✅ Autonomous System started');
  
  // Initialize Discord bot
  logger.info('🎮 Initializing Discord Bot...');
  discordBot = new DiscordBot(config, chatAgent);
  discordBot.setAutonomousSystem(autonomousSystem);
  await discordBot.start();
  logger.info('✅ Discord Bot started');
  
  logger.info('🎉 AIAS Started successfully');
  logger.info('🤖 Ready to receive messages!');
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('🛑 AIAS Shutting down...');
  
  try {
    if (autonomousSystem) {
      autonomousSystem.stop();
    }
    
    if (discordBot) {
      await discordBot.stop();
    }
    
    if (chatAgent) {
      await chatAgent.close();
    }
    
    logger.info('✅ AIAS Shutdown complete');
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the application
main().catch((error) => {
  logger.error('❌ Failed to start AIAS:', error);
  process.exit(1);
});