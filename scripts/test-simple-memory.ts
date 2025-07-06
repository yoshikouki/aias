#!/usr/bin/env tsx
/**
 * Test Simple Memory System
 */

import 'dotenv/config';
import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { MemoryEnhancedAgent } from '../src/agents/memory-enhanced-agent.js';

async function testSimpleMemory(): Promise<void> {
  logger.info('🧪 === Simple Memory System Test ===');
  
  // Load configuration
  const configResult = loadConfig();
  if (!configResult.success) {
    throw new Error(`Configuration error: ${configResult.error}`);
  }
  const config = configResult.config;
  
  // Initialize memory-enhanced chat agent
  const chatAgent = new MemoryEnhancedAgent(config);
  await chatAgent.initialize();
  
  const testUserId = 'test-user-memory-001';
  const testChannelId = 'test-channel-memory-001';
  
  // Test 1: Personal Information
  logger.info('\n📝 Test 1: Personal Information Memory');
  const personalMessage = {
    role: 'user' as const,
    content: '私の名前は山田花子です。ソフトウェアエンジニアとして働いています。趣味はプログラミングと音楽で、特にJavaScriptとピアノが好きです。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response1 = await chatAgent.processMessage(personalMessage);
  logger.info('Response:', response1.content.substring(0, 200));
  logger.info('Memories extracted:', response1.memoriesExtracted);
  logger.info('Profile updated:', response1.profileUpdated);
  
  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Memory Recall
  logger.info('\n🔍 Test 2: Memory Recall');
  const recallMessage = {
    role: 'user' as const,
    content: '私の名前と趣味について覚えていますか？',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response2 = await chatAgent.processMessage(recallMessage);
  logger.info('Response:', response2.content.substring(0, 300));
  
  // Test 3: Skills and Goals
  logger.info('\n🎯 Test 3: Skills and Goals');
  const skillMessage = {
    role: 'user' as const,
    content: 'ReactとNode.jsが得意です。来年はAI開発を学んで、機械学習エンジニアになりたいです。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response3 = await chatAgent.processMessage(skillMessage);
  logger.info('Response:', response3.content.substring(0, 200));
  logger.info('Memories extracted:', response3.memoriesExtracted);
  
  // Test 4: Knowledge Storage
  logger.info('\n💡 Test 4: Knowledge Storage');
  const knowledgeMessage = {
    role: 'user' as const,
    content: '覚えておいて：TypeScriptの型システムはコンパイル時にエラーを検出できる優れた機能です。',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response4 = await chatAgent.processMessage(knowledgeMessage);
  logger.info('Response:', response4.content.substring(0, 200));
  
  // Test 5: Memory Search
  logger.info('\n🔎 Test 5: Memory Search');
  const searchResults = await chatAgent.searchMemories(testUserId, 'プログラミング', 5);
  logger.info('Search results for "プログラミング":');
  searchResults.forEach((result, i) => {
    logger.info(`  ${i + 1}. [${result.category}] ${result.value} (importance: ${result.importance})`);
  });
  
  // Test 6: Category-based retrieval
  logger.info('\n📚 Test 6: Memories by Category');
  const personalMemories = await chatAgent.getMemoriesByCategory(testUserId, 'personal');
  logger.info('Personal memories:');
  personalMemories.forEach((memory, i) => {
    logger.info(`  ${i + 1}. ${memory.key}: ${memory.value}`);
  });
  
  const skillMemories = await chatAgent.getMemoriesByCategory(testUserId, 'skills');
  logger.info('Skills memories:');
  skillMemories.forEach((memory, i) => {
    logger.info(`  ${i + 1}. ${memory.key}: ${memory.value}`);
  });
  
  // Test 7: Memory Statistics
  logger.info('\n📊 Test 7: Memory Statistics');
  const stats = await chatAgent.getMemoryStats(testUserId);
  logger.info('Memory Statistics:');
  logger.info(`  Total memories: ${stats.totalMemories}`);
  logger.info('  Categories:');
  stats.categories.forEach((cat: any) => {
    logger.info(`    ${cat.name}: ${cat.count} memories (avg importance: ${cat.avgImportance?.toFixed(2)})`);
  });
  
  logger.info('  User Profile:');
  logger.info(`    Name: ${stats.profile.name || 'Not set'}`);
  logger.info(`    Occupation: ${stats.profile.occupation || 'Not set'}`);
  logger.info(`    Interests: ${stats.profile.interests.join(', ') || 'None'}`);
  logger.info(`    Skills: ${stats.profile.skills.join(', ') || 'None'}`);
  logger.info(`    Goals: ${stats.profile.goals.join(', ') || 'None'}`);
  
  // Test 8: Manual Profile Update
  logger.info('\n👤 Test 8: Manual Profile Update');
  await chatAgent.updateUserProfile(testUserId, {
    interests: ['機械学習', 'AI開発'],
    skills: ['Python', 'TensorFlow'],
    preferences: { 
      workStyle: 'リモート優先',
      learningStyle: '実践的な学習'
    }
  });
  
  const updatedStats = await chatAgent.getMemoryStats(testUserId);
  logger.info('Updated Profile:');
  logger.info(`  Interests: ${updatedStats.profile.interests.join(', ')}`);
  logger.info(`  Skills: ${updatedStats.profile.skills.join(', ')}`);
  logger.info(`  Preferences: ${JSON.stringify(updatedStats.profile.preferences)}`);
  
  // Test 9: Context-aware conversation
  logger.info('\n💬 Test 9: Context-aware Conversation');
  const contextMessage = {
    role: 'user' as const,
    content: 'AIの勉強を始めるのに、どんなことから始めるのがおすすめですか？',
    timestamp: new Date(),
    userId: testUserId,
    channelId: testChannelId,
    platform: 'discord' as const,
  };
  
  const response9 = await chatAgent.processMessage(contextMessage);
  logger.info('Context-aware response:', response9.content.substring(0, 400));
  
  logger.info('\n✅ Simple Memory Test Complete!');
  
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
  testSimpleMemory().catch((error) => {
    logger.error('💥 Simple memory test failed:', error);
    process.exit(1);
  });
}