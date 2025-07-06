#!/usr/bin/env node
/**
 * Live Discord RSS debugging
 */

import 'dotenv/config';
import { logger } from './src/utils/logger.js';
import { loadConfig } from './src/core/config.js';
import { ChatAgent } from './src/agents/chat-agent.js';
import { DiscordBot } from './src/platforms/discord/bot.js';
import { AutonomousSystem } from './src/autonomous/index.js';

async function debugLive() {
  logger.info('🔍 Live RSS Debug Session Starting...');
  
  // Load config
  const configResult = loadConfig();
  if (!configResult.success) {
    throw new Error(`Configuration error: ${configResult.error}`);
  }
  const config = configResult.config;
  
  // Initialize components
  const chatAgent = new ChatAgent(config);
  await chatAgent.initialize();
  
  const autonomousSystem = new AutonomousSystem(chatAgent, {
    enabled: true,
    schedulerEnabled: false,
    triggersEnabled: true,
    defaultTasks: false,
    defaultTriggers: true,
    advancedActionsEnabled: true,
    rssMonitoringEnabled: true,
  });
  await autonomousSystem.initialize();
  autonomousSystem.start();
  
  const discordBot = new DiscordBot(config, chatAgent);
  discordBot.setAutonomousSystem(autonomousSystem);
  
  // Enhanced logging for RSS debugging
  const originalProcessMessage = autonomousSystem.processMessage.bind(autonomousSystem);
  autonomousSystem.processMessage = async (message, channelName) => {
    logger.info(`🔄 AutonomousSystem.processMessage called:`);
    logger.info(`   Message: ${message.content.substring(0, 100)}...`);
    logger.info(`   Channel: ${channelName || 'undefined'}`);
    logger.info(`   User: ${message.userId}`);
    logger.info(`   Platform: ${message.platform}`);
    logger.info(`   RSS Enabled: ${autonomousSystem.config?.rssMonitoringEnabled}`);
    
    return originalProcessMessage(message, channelName);
  };
  
  // Track RSS callbacks
  let rssCallbackCount = 0;
  autonomousSystem.setRSSMessageCallback(async (channelId, platform, content) => {
    rssCallbackCount++;
    logger.info(`🚀 RSS CALLBACK #${rssCallbackCount}:`);
    logger.info(`   Channel: ${channelId}`);
    logger.info(`   Platform: ${platform}`);
    logger.info(`   Content Length: ${content.length}`);
    logger.info(`   Content Preview: ${content.substring(0, 200)}...`);
    
    // Actually send to Discord
    await discordBot.sendMessageToChannel(channelId, content);
  });
  
  await discordBot.start();
  
  // Status reporting
  setInterval(() => {
    const status = autonomousSystem.getStatus();
    const discordStatus = discordBot.getStatus();
    logger.info(`📊 Status Report:`);
    logger.info(`   Discord Connected: ${discordStatus.connected}`);
    logger.info(`   Autonomous RSS Enabled: ${status.rssMonitoring.enabled}`);
    logger.info(`   RSS Stats: ${JSON.stringify(status.rssMonitoring)}`);
    logger.info(`   RSS Callbacks Called: ${rssCallbackCount}`);
  }, 60000); // Every minute
  
  logger.info('✅ Live debug session ready!');
  logger.info('📝 Now post a URL in Discord #rss channel to test...');
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Debug session interrupted');
  process.exit(0);
});

debugLive().catch(console.error);