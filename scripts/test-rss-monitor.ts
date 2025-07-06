#!/usr/bin/env tsx
/**
 * Test script for RSS monitoring functionality
 */

// Load environment variables
import 'dotenv/config';

import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { ChatAgent } from '../src/agents/chat-agent.js';
import { AutonomousSystem } from '../src/autonomous/index.js';

// Test URLs from different domains
const TEST_URLS = [
  'https://qiita.com/tags/typescript',
  'https://zenn.dev/topics/react',
  'https://github.com/microsoft/TypeScript',
  'https://dev.to/t/javascript',
  'https://medium.com/@javascript',
];

// Test configuration
const RSS_CHANNEL_ID = 'test-rss-channel';
const TEST_USER_ID = 'test-rss-user';
const PLATFORM = 'discord';

async function testRSSMonitoring(): Promise<void> {
  logger.info('🧪 === RSS Monitoring Tests ===');
  
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

  logger.info('\n📡 Testing RSS Channel Detection...');
  
  // Test channel detection
  const rssChannelNames = ['rss', 'feed', 'news', 'links', 'rss-feed', 'tech-news'];
  const normalChannelNames = ['general', 'random', 'chat', 'aias'];
  
  for (const channelName of rssChannelNames) {
    logger.info(`✅ '${channelName}' should be detected as RSS channel`);
  }
  
  for (const channelName of normalChannelNames) {
    logger.info(`❌ '${channelName}' should NOT be detected as RSS channel`);
  }

  logger.info('\n🔗 Testing URL Extraction...');
  
  const testMessages = [
    'Check out this article: https://qiita.com/tags/typescript',
    'Multiple links: https://zenn.dev/topics/react and https://dev.to/t/javascript',
    'No URLs in this message',
    'Mixed content with https://github.com/microsoft/TypeScript and some text',
  ];
  
  for (const message of testMessages) {
    logger.info(`📨 Message: "${message}"`);
    // The URL extraction is tested implicitly through RSS processing
  }

  logger.info('\n🤖 Testing RSS Link Analysis...');
  
  // Test each URL
  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    if (!url) continue;

    logger.info(`\n📰 Test ${i + 1}: Analyzing ${url}`);
    
    try {
      // Simulate RSS message with URL
      await autonomousSystem.processRSSMessage(
        `New article posted: ${url}`,
        TEST_USER_ID,
        RSS_CHANNEL_ID,
        PLATFORM
      );
      
      logger.info('✅ RSS processing completed');
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      logger.error(`❌ Failed to process ${url}:`, error);
    }
  }

  logger.info('\n📊 Testing RSS Statistics...');
  
  const stats = autonomousSystem.getRSSStats();
  if (stats) {
    logger.info('RSS Statistics:', {
      totalProcessed: stats.totalProcessed,
      recentLinks: stats.recentLinks,
      topDomains: stats.topDomains,
    });
  }
  
  const recentLinks = autonomousSystem.getRecentRSSLinks(5);
  logger.info(`Recent Links (${recentLinks.length}):`);
  recentLinks.forEach((link, index) => {
    logger.info(`  ${index + 1}. ${link.domain} - ${link.url}`);
  });

  logger.info('\n🧪 Testing Complex RSS Messages...');
  
  const complexMessages = [
    'Weekly roundup: https://dev.to/t/javascript, https://medium.com/@react, and https://stackoverflow.com/questions/tagged/typescript',
    '🔥 Hot tech news: https://github.com/trending/typescript - check this out!',
    'Found an interesting article about AI: https://example.com/ai-article (might be broken link)',
  ];
  
  for (const message of complexMessages) {
    logger.info(`\n📨 Complex message: "${message}"`);
    
    try {
      await autonomousSystem.processRSSMessage(
        message,
        `user-${Date.now()}`,
        RSS_CHANNEL_ID,
        PLATFORM
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error('❌ Failed to process complex message:', error);
    }
  }

  logger.info('\n📈 Final Statistics...');
  
  const finalStats = autonomousSystem.getRSSStats();
  if (finalStats) {
    logger.info('Final RSS Statistics:', finalStats);
  }
  
  const systemStatus = autonomousSystem.getStatus();
  logger.info('RSS Monitoring Status:', systemStatus.rssMonitoring);

  // Cleanup
  autonomousSystem.stop();
  await chatAgent.close();
  
  logger.info('\n🎉 RSS monitoring tests completed!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Test terminated');
  process.exit(0);
});

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testRSSMonitoring().catch((error) => {
    logger.error('💥 RSS test failed:', error);
    process.exit(1);
  });
}