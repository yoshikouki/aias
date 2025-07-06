#!/usr/bin/env tsx
/**
 * Test script for persistent memory features
 */

// Load environment variables
import 'dotenv/config';

import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { ChatAgent, type ChatMessage } from '../src/agents/chat-agent.js';
import { AutonomousSystem } from '../src/autonomous/index.js';

// Test configuration
const TEST_CONFIG = {
  userId: 'test-persistent-user',
  channelId: 'test-persistent-channel',
  platform: 'discord' as const,
};

async function createTestMessage(content: string, userId?: string): Promise<ChatMessage> {
  return {
    role: 'user',
    content,
    timestamp: new Date(),
    userId: userId || TEST_CONFIG.userId,
    channelId: TEST_CONFIG.channelId,
    platform: TEST_CONFIG.platform,
  };
}

async function testPersistentMemory(): Promise<void> {
  logger.info('🧪 === Persistent Memory Tests ===');
  
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
  });
  await autonomousSystem.initialize();
  autonomousSystem.start();

  // Test memory persistence
  logger.info('\n🧠 Testing Memory Persistence...');
  
  const memoryTests = [
    { content: '私の名前は田中太郎です。', description: '名前の登録' },
    { content: '私はエンジニアとして働いています。', description: '職業の登録' },
    { content: '趣味はプログラミングです。', description: '趣味の登録' },
    { content: '好きな言語はTypeScriptです。', description: '好みの登録' },
  ];
  
  for (const test of memoryTests) {
    logger.info(`\n📝 ${test.description}: "${test.content}"`);
    const message = await createTestMessage(test.content);
    const response = await chatAgent.processMessage(message);
    logger.info(`🤖 Response: "${response.content.substring(0, 100)}..."`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test memory recall
  logger.info('\n🔍 Testing Memory Recall...');
  
  const recallTests = [
    '私の名前を覚えていますか？',
    '私の仕事について教えてください',
    '私の趣味は何でしたか？',
    '私の好きなプログラミング言語は？',
  ];
  
  for (const content of recallTests) {
    logger.info(`\n❓ Recall test: "${content}"`);
    const message = await createTestMessage(content);
    const response = await chatAgent.processMessage(message);
    logger.info(`🤖 Response: "${response.content}"`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test conversation history persistence
  logger.info('\n📚 Testing Conversation History...');
  
  const history = await chatAgent.getConversationHistory(
    TEST_CONFIG.platform,
    TEST_CONFIG.channelId,
    20
  );
  
  logger.info(`📊 Found ${history.length} messages in history:`);
  history.slice(-5).forEach((msg, index) => {
    logger.info(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  });

  // Test user profile
  logger.info('\n👤 Testing User Profile...');
  
  const userProfile = await chatAgent.getUserProfile(TEST_CONFIG.userId, TEST_CONFIG.platform);
  logger.info('User profile:', {
    userId: userProfile.userId,
    platform: userProfile.platform,
    displayName: userProfile.displayName,
    preferencesCount: Object.keys(userProfile.preferences || {}).length,
    metadataCount: Object.keys(userProfile.metadata || {}).length,
  });

  // Test memory search
  logger.info('\n🔎 Testing Memory Search...');
  
  const searchResults = await chatAgent.searchMemories(
    TEST_CONFIG.userId,
    TEST_CONFIG.platform,
    'プログラミング'
  );
  
  logger.info(`Found ${searchResults.length} memory entries matching 'プログラミング':`);
  searchResults.forEach((memory, index) => {
    logger.info(`  ${index + 1}. ${memory.category}:${memory.key} = ${memory.value}`);
  });

  // Test database stats
  logger.info('\n📊 Testing Database Statistics...');
  
  const dbStats = chatAgent.getDatabaseStats();
  logger.info('Database statistics:', dbStats);

  // Test activity tracking
  logger.info('\n📈 Testing Activity Tracking...');
  
  // Simulate multiple users and activity
  const users = ['user1', 'user2', 'user3'];
  const activities = [
    'TypeScriptについて質問があります',
    'Reactの新機能について教えて',
    '今日のプロジェクト進捗を報告します',
    'エラーが発生しました。助けてください',
    'コードレビューをお願いします',
  ];
  
  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    const activity = activities[i % activities.length];
    const message = await createTestMessage(`${activity} #${i + 1}`, user);
    
    // Process through autonomous system for activity tracking
    await autonomousSystem.processMessage(message);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Get activity summary
  const activitySummary = await autonomousSystem.getActivitySummary();
  if (activitySummary) {
    logger.info('Activity summary:', activitySummary);
  }
  
  const channelStats = autonomousSystem.getChannelStats(TEST_CONFIG.channelId, TEST_CONFIG.platform);
  if (channelStats) {
    logger.info('Channel statistics:', {
      messageCount: channelStats.messageCount,
      uniqueUsers: channelStats.uniqueUsers.size,
      topics: channelStats.topics,
      lastActivity: channelStats.lastMessageTime,
    });
  }

  // Cleanup
  autonomousSystem.stop();
  await chatAgent.close();
  
  logger.info('\n🎉 All persistent memory tests completed successfully!');
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
  testPersistentMemory().catch((error) => {
    logger.error('💥 Test failed:', error);
    process.exit(1);
  });
}