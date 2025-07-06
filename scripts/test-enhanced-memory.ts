#!/usr/bin/env tsx
/**
 * Test Enhanced Memory System
 */

import 'dotenv/config';
import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { EnhancedChatAgent } from '../src/agents/enhanced-chat-agent.js';
import { AdvancedMemoryManager } from '../src/core/advanced-memory.js';

async function testEnhancedMemory(): Promise<void> {
  logger.info('🧪 === Enhanced Memory System Test ===');
  
  // Load configuration
  const configResult = loadConfig();
  if (!configResult.success) {
    throw new Error(`Configuration error: ${configResult.error}`);
  }
  const config = configResult.config;
  
  // Initialize enhanced chat agent
  const chatAgent = new EnhancedChatAgent(config);
  await chatAgent.initialize();
  
  const testUserId = 'test-user-001';
  const testChannelId = 'test-channel-001';
  
  logger.info('\n📝 Test 1: Personal Information Memory');
  const personalMessage = {
    role: 'user' as const,
    content: '私の名前は田中太郎です。エンジニアとして働いています。趣味はプログラミングと読書で、特にSFが好きです。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response1 = await chatAgent.processMessage(personalMessage);
  logger.info('Response:', response1.content.substring(0, 200));
  logger.info('Memories created:', response1.memoriesCreated?.length || 0);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  logger.info('\n🔍 Test 2: Memory Recall');
  const recallMessage = {
    role: 'user' as const,
    content: '私の趣味について覚えていますか？',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response2 = await chatAgent.processMessage(recallMessage);
  logger.info('Response:', response2.content.substring(0, 300));
  
  logger.info('\n😊 Test 3: Emotional Episode');
  const emotionalMessage = {
    role: 'user' as const,
    content: '今日はプロジェクトが成功して本当に嬉しい！チームメンバーと一緒に頑張った甲斐がありました。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response3 = await chatAgent.processMessage(emotionalMessage);
  logger.info('Response:', response3.content.substring(0, 200));
  logger.info('Episodes detected:', response3.episodesDetected?.length || 0);
  
  logger.info('\n🎯 Test 4: Goal Setting');
  const goalMessage = {
    role: 'user' as const,
    content: '来年はAIエンジニアとしてもっと成長したいです。機械学習の勉強を頑張ります。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response4 = await chatAgent.processMessage(goalMessage);
  logger.info('Response:', response4.content.substring(0, 200));
  
  logger.info('\n💡 Test 5: Knowledge Storage');
  const knowledgeMessage = {
    role: 'user' as const,
    content: '覚えておいて：TypeScriptの型推論は強力だけど、明示的な型注釈も重要だということを学びました。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response5 = await chatAgent.processMessage(knowledgeMessage);
  logger.info('Response:', response5.content.substring(0, 200));
  
  // Test semantic search
  logger.info('\n🔎 Test 6: Semantic Memory Search');
  const memoryManager = new AdvancedMemoryManager({
    storagePath: `file:${config.database.path.replace('.db', '-memory.db')}`,
    vectorPath: `file:${config.database.path.replace('.db', '-vector.db')}`,
  });
  
  const searchResults = await memoryManager.searchRelatedMemories(
    testUserId,
    'プログラミングの趣味',
    5
  );
  
  logger.info('Search results:', searchResults.length);
  searchResults.forEach((result, i) => {
    logger.info(`  ${i + 1}. Score: ${result.score?.toFixed(3)}, Content: ${result.content?.substring(0, 100)}`);
  });
  
  // Get memory statistics
  logger.info('\n📊 Test 7: Memory Statistics');
  const stats = await chatAgent.getMemoryStats(testUserId);
  logger.info('Memory Statistics:');
  logger.info(`  Total memories: ${stats.totalMemories}`);
  logger.info(`  Categories: ${stats.categories.join(', ')}`);
  logger.info('  Profile:', JSON.stringify(stats.profile, null, 2));
  
  // Test user profile
  logger.info('\n👤 Test 8: User Profile');
  await chatAgent.updateUserProfileFromConversation(testUserId, {
    skills: ['TypeScript', 'Node.js', 'React'],
    preferences: {
      interests: ['AI', 'Machine Learning'],
      values: ['成長', '学習', 'チームワーク']
    }
  });
  
  const finalStats = await chatAgent.getMemoryStats(testUserId);
  logger.info('Updated Profile:', JSON.stringify(finalStats.profile, null, 2));
  
  // Organize knowledge
  logger.info('\n📚 Test 9: Knowledge Organization');
  const organized = await memoryManager.organizeKnowledge(testUserId);
  logger.info('Organized Knowledge:');
  Object.entries(organized.organized).forEach(([category, memories]) => {
    logger.info(`  ${category}: ${(memories as any[]).length} memories`);
  });
  
  logger.info('\n✅ Enhanced Memory Test Complete!');
  
  // Cleanup
  await chatAgent.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedMemory().catch((error) => {
    logger.error('💥 Enhanced memory test failed:', error);
    process.exit(1);
  });
}