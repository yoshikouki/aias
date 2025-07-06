/**
 * WebFetch Tool Test
 * Direct testing of webFetch functionality
 */

import { ChatAgent } from '../agents/chat-agent.js';
import { loadConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';

async function testWebFetch(): Promise<void> {
  console.log('🧪 WebFetch Tool Test');
  console.log('========================');

  try {
    // Initialize ChatAgent
    const config = loadConfig();
    if (!config.success) {
      throw new Error(`Config error: ${config.error}`);
    }

    const chatAgent = new ChatAgent(config.config);
    await chatAgent.initialize();

    // Test URL
    const testUrl = 'https://github.com/microsoft/typescript';
    
    console.log(`🔗 Testing URL: ${testUrl}`);
    
    // Create test message requesting webFetch
    const testMessage = {
      role: 'user' as const,
      content: `webFetchツールを使って、以下のURLの内容を取得してください：${testUrl}

取得できた内容から以下を抽出してください：
- ページタイトル
- 主要な内容（最初の200文字程度）
- 技術的なキーワード`,
      timestamp: new Date(),
      userId: 'test-user',
      channelId: 'test-channel',
      platform: 'discord' as const,
    };

    console.log('📤 Sending test message to ChatAgent...');
    const response = await chatAgent.processMessage(testMessage);
    
    console.log('📥 Response received:');
    console.log('----------------------------------------');
    console.log(response.content);
    console.log('----------------------------------------');
    
    // Check if webFetch was actually used
    if (response.content.includes('WebFetchツールが使えない') || 
        response.content.includes('取得できませんでした')) {
      console.log('❌ WebFetch tool appears to not be working');
    } else if (response.content.includes('Title:') || 
               response.content.includes('microsoft') ||
               response.content.includes('TypeScript')) {
      console.log('✅ WebFetch tool appears to be working');
    } else {
      console.log('⚠️  WebFetch result unclear');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebFetch();
}