#!/usr/bin/env tsx
/**
 * AIAS Manual Testing Script
 * Tests core functionality without Discord dependency
 */

// Load environment variables
import 'dotenv/config';

import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';
import { ChatAgent, type ChatMessage } from '../src/agents/chat-agent.js';
import { AutonomousSystem } from '../src/autonomous/index.js';

// Test configuration
const TEST_CONFIG = {
  userId: 'test-user-123',
  channelId: 'test-channel-456',
  platform: 'discord' as const,
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Basic Greeting',
    message: 'こんにちは！初めまして。',
    expectation: '挨拶に対する温かい返答',
  },
  {
    name: 'Memory Test - Introduction',
    message: '私の名前は田中です。プログラマーをしています。',
    expectation: '自己紹介の記憶',
  },
  {
    name: 'Memory Test - Recall',
    message: '私の名前を覚えていますか？',
    expectation: '田中という名前を記憶しているかテスト',
  },
  {
    name: 'Help Request',
    message: 'TypeScriptについて教えてください。',
    expectation: 'ヘルプ要求への対応',
  },
  {
    name: 'Conversation Context',
    message: 'それでは具体的にどんな機能がありますか？',
    expectation: '前の文脈を理解した返答',
  },
];

async function createTestMessage(content: string): Promise<ChatMessage> {
  return {
    role: 'user',
    content,
    timestamp: new Date(),
    userId: TEST_CONFIG.userId,
    channelId: TEST_CONFIG.channelId,
    platform: TEST_CONFIG.platform,
  };
}

async function testChatAgent(chatAgent: ChatAgent): Promise<void> {
  logger.info('🧪 === Chat Agent Tests ===');
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    if (!scenario) continue;

    logger.info(`\n📝 Test ${i + 1}: ${scenario.name}`);
    logger.info(`📨 Input: "${scenario.message}"`);
    logger.info(`🎯 Expected: ${scenario.expectation}`);
    
    try {
      const testMessage = await createTestMessage(scenario.message);
      const response = await chatAgent.processMessage(testMessage);
      
      if (response.shouldReply) {
        logger.info(`✅ Success: "${response.content}"`);
      } else {
        logger.error(`❌ Failed: Response should reply was false`);
        logger.error(`❌ Error details: ${JSON.stringify(response.metadata, null, 2)}`);
      }
    } catch (error) {
      logger.error(`💥 Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testAutonomousSystem(autonomousSystem: AutonomousSystem): Promise<void> {
  logger.info('\n🤖 === Autonomous System Tests ===');
  
  // Test status
  const status = autonomousSystem.getStatus();
  logger.info('📊 Autonomous System Status:');
  logger.info(`  - Enabled: ${status.enabled}`);
  logger.info(`  - Scheduler running: ${status.scheduler.running}`);
  logger.info(`  - Active tasks: ${status.scheduler.activeTasks}`);
  logger.info(`  - Active triggers: ${status.triggers.activeTriggers}`);
  logger.info(`  - Available actions: ${status.actions.availableActions}`);
  
  // Test trigger activation
  logger.info('\n🎯 Testing Trigger Activation:');
  
  const triggerTestMessages = [
    'Hello there!',
    'Can you help me with something?',
    'Good morning everyone!',
  ];
  
  for (const messageContent of triggerTestMessages) {
    logger.info(`\n📨 Trigger test: "${messageContent}"`);
    
    try {
      const testMessage = await createTestMessage(messageContent);
      await autonomousSystem.processMessage(testMessage);
      logger.info('✅ Trigger processing completed');
    } catch (error) {
      logger.error(`❌ Trigger test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function testMemoryPersistence(chatAgent: ChatAgent): Promise<void> {
  logger.info('\n🧠 === Memory Persistence Tests ===');
  
  const memoryTests = [
    { message: '私の好きな色は青です。', note: 'Setting preference' },
    { message: '私の趣味は読書です。', note: 'Adding hobby' },
    { message: '私の好きな色は何でしたか？', note: 'Recalling color preference' },
    { message: '私の趣味について聞かせて', note: 'Recalling hobby' },
  ];
  
  for (let i = 0; i < memoryTests.length; i++) {
    const test = memoryTests[i];
    if (!test) continue;

    logger.info(`\n🔍 Memory Test ${i + 1}: ${test.note}`);
    logger.info(`📨 Message: "${test.message}"`);
    
    try {
      const testMessage = await createTestMessage(test.message);
      const response = await chatAgent.processMessage(testMessage);
      
      logger.info(`🤖 Response: "${response.content}"`);
    } catch (error) {
      logger.error(`❌ Memory test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testConversationHistory(chatAgent: ChatAgent): Promise<void> {
  logger.info('\n📚 === Conversation History Tests ===');
  
  try {
    const history = await chatAgent.getConversationHistory(
      TEST_CONFIG.platform,
      TEST_CONFIG.channelId,
      10
    );
    
    logger.info(`📊 Conversation History (${history.length} messages):`);
    
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      const msg = history[i];
      if (msg) {
        logger.info(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      }
    }
    
    if (history.length === 0) {
      logger.warn('⚠️  No conversation history found');
    }
  } catch (error) {
    logger.error(`❌ History test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function runAllTests(): Promise<void> {
  try {
    logger.info('🚀 Starting AIAS Manual Tests...\n');
    
    // Load configuration
    logger.info('📋 Loading configuration...');
    const configResult = loadConfig();
    if (!configResult.success) {
      throw new Error(`Configuration error: ${configResult.error}`);
    }
    const config = configResult.config;
    logger.info('✅ Configuration loaded');
    
    // Initialize Chat Agent
    logger.info('🧠 Initializing Chat Agent...');
    const chatAgent = new ChatAgent(config);
    await chatAgent.initialize();
    logger.info('✅ Chat Agent initialized');
    
    // Initialize Autonomous System
    logger.info('🤖 Initializing Autonomous System...');
    const autonomousSystem = new AutonomousSystem(chatAgent, {
      enabled: true,
      schedulerEnabled: false, // Disable scheduler for testing
      triggersEnabled: true,
      defaultTasks: false,
      defaultTriggers: true,
    });
    await autonomousSystem.initialize();
    autonomousSystem.start();
    logger.info('✅ Autonomous System initialized');
    
    // Run tests
    await testChatAgent(chatAgent);
    await testAutonomousSystem(autonomousSystem);
    await testMemoryPersistence(chatAgent);
    await testConversationHistory(chatAgent);
    
    // Cleanup
    autonomousSystem.stop();
    
    logger.info('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    logger.error(`💥 Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
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
  runAllTests().catch((error) => {
    logger.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}