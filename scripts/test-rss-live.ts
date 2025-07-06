#!/usr/bin/env tsx
/**
 * Live RSS functionality test
 */

// Load environment variables
import 'dotenv/config';

import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { ChatAgent } from '../src/agents/chat-agent.js';
import { AutonomousSystem } from '../src/autonomous/index.js';

// Test with a real RSS channel ID (you'll need to update this)
const RSS_CHANNEL_ID = '1362229849011257527'; // #rss channel ID from Discord status
const TEST_USER_ID = 'test-user-rss';
const PLATFORM = 'discord';

async function testLiveRSS(): Promise<void> {
  logger.info('🧪 === Live RSS Functionality Test ===');
  
  // Load configuration
  const configResult = loadConfig();
  if (!configResult.success) {
    throw new Error(`Configuration error: ${configResult.error}`);
  }
  const config = configResult.config;
  
  // Initialize systems
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

  // Mock Discord message callback (since we're not connected to Discord here)
  let sentMessages: { channelId: string; content: string }[] = [];
  autonomousSystem.setRSSMessageCallback(async (channelId: string, platform: string, content: string) => {
    logger.info(`Mock Discord send to channel ${channelId}:`);
    logger.info(`--- MESSAGE START ---`);
    logger.info(content);
    logger.info(`--- MESSAGE END ---`);
    sentMessages.push({ channelId, content });
  });

  logger.info('\n🔗 Testing RSS URL Processing...');
  
  // Test various URLs
  const testUrls = [
    'https://qiita.com/tags/typescript',
    'https://zenn.dev/topics/react',
    'https://github.com/microsoft/vscode',
  ];

  for (const url of testUrls) {
    logger.info(`\n📰 Processing: ${url}`);
    
    try {
      // Simulate RSS channel message
      await autonomousSystem.processRSSMessage(
        `Interesting article: ${url}`,
        TEST_USER_ID,
        RSS_CHANNEL_ID,
        PLATFORM
      );
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      logger.error(`Failed to process ${url}:`, error);
    }
  }

  logger.info('\n📊 Test Results Summary:');
  logger.info(`Total messages sent: ${sentMessages.length}`);
  
  const stats = autonomousSystem.getRSSStats();
  if (stats) {
    logger.info('RSS Statistics:', stats);
  }

  // Cleanup
  autonomousSystem.stop();
  await chatAgent.close();
  
  logger.info('\n🎉 Live RSS test completed!');
  logger.info('\n💡 Now try posting a URL in the #rss channel on Discord to see the live functionality!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testLiveRSS().catch((error) => {
    logger.error('💥 Live RSS test failed:', error);
    process.exit(1);
  });
}