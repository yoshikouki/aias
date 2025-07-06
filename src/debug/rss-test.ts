/**
 * RSS Monitor Test Utility
 * Independent testing system for RSS functionality debugging
 * Design philosophy: Simple, direct, observable (Pike/Carmack style)
 */

import { RSSMonitor } from '../autonomous/rss-monitor.js';
import { logger } from '../utils/logger.js';

/**
 * Test scenarios following t-wada's systematic approach
 */
interface TestScenario {
  name: string;
  input: string;
  expectedBehavior: string;
  assertions: string[];
}

export class RSSTestRunner {
  private rssMonitor: RSSMonitor;

  constructor() {
    // Create minimal mock ChatAgent for testing (Carmack: avoid unnecessary dependencies)
    const mockChatAgent = {
      processMessage: async (message: any) => {
        console.log(`  🤖 Mock ChatAgent received: ${message.content.substring(0, 50)}...`);
        return { content: 'Mock analysis response', shouldReply: false };
      }
    } as any;
    
    this.rssMonitor = new RSSMonitor(mockChatAgent, './data/test-timeseries.db');
  }

  /**
   * Test 1: Basic URL extraction (Uncle Bob: test one thing at a time)
   */
  testUrlExtraction(): void {
    console.log('\n🧪 Test 1: URL Extraction');
    
    const testCases = [
      {
        input: 'Check this out: https://github.com/microsoft/typescript',
        expected: 1
      },
      {
        input: 'Multiple links: https://example.com and https://test.org/path?param=value',
        expected: 2
      },
      {
        input: 'No URLs here, just text',
        expected: 0
      },
      {
        input: 'Broken URL: htp://invalid.com',
        expected: 0
      },
      {
        input: 'URL with extra chars: https://example.com/path`))))))',
        expected: 1
      },
      {
        input: 'Complex message: 🔗 **Check this: https://github.com/test/repo** `))))))',
        expected: 1
      }
    ];

    let passed = 0;
    for (const testCase of testCases) {
      const urls = this.rssMonitor.extractUrls(testCase.input);
      const success = urls.length === testCase.expected;
      
      console.log(`  ❯ "${testCase.input.substring(0, 50)}..."`);
      console.log(`    Expected: ${testCase.expected}, Got: ${urls.length} ${success ? '✅' : '❌'}`);
      console.log(`    URLs: [${urls.join(', ')}]`);
      
      if (success) passed++;
    }
    
    console.log(`  Result: ${passed}/${testCases.length} tests passed\n`);
  }

  /**
   * Test 2: Channel recognition (Pike: explicit is better than implicit)
   */
  testChannelRecognition(): void {
    console.log('🧪 Test 2: Channel Recognition');
    
    const testCases = [
      { channel: 'rss', expected: true },
      { channel: 'RSS', expected: true },
      { channel: 'rss-feed', expected: true },
      { channel: 'news-feed', expected: true },
      { channel: 'tech-links', expected: true },
      { channel: 'general', expected: false },
      { channel: 'random', expected: false },
      { channel: 'testing', expected: false }
    ];

    let passed = 0;
    for (const testCase of testCases) {
      const result = this.rssMonitor.isRSSChannel(testCase.channel);
      const success = result === testCase.expected;
      
      console.log(`  ❯ Channel: "${testCase.channel}"`);
      console.log(`    Expected: ${testCase.expected}, Got: ${result} ${success ? '✅' : '❌'}`);
      
      if (success) passed++;
    }
    
    console.log(`  Result: ${passed}/${testCases.length} tests passed\n`);
  }

  /**
   * Test 3: Full RSS message processing (integration test)
   */
  async testRSSMessageProcessing(): Promise<void> {
    console.log('🧪 Test 3: RSS Message Processing');
    
    // Setup callback to capture sent messages
    const sentMessages: Array<{channelId: string, platform: string, content: string}> = [];
    this.rssMonitor.setSendMessageCallback(async (channelId, platform, content) => {
      sentMessages.push({ channelId, platform, content });
      console.log(`  📤 Message sent to ${platform}:${channelId}`);
      console.log(`      Content: ${content.substring(0, 100)}...`);
    });

    const testMessage = 'New article: https://github.com/microsoft/typescript/releases/tag/v5.0.0';
    
    console.log(`  ❯ Processing: "${testMessage}"`);
    
    try {
      await this.rssMonitor.processRSSMessage(
        testMessage,
        'test-user-123',
        'test-channel-456',
        'discord',
        new Date()
      );
      
      console.log(`  ✅ Processing completed without errors`);
      console.log(`  📊 Messages sent: ${sentMessages.length}`);
      
      if (sentMessages.length > 0) {
        console.log(`  💬 Latest message preview: ${sentMessages[0].content.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`  ❌ Processing failed: ${error}`);
    }
    
    console.log('');
  }

  /**
   * Test 4: System state inspection
   */
  testSystemState(): void {
    console.log('🧪 Test 4: System State');
    
    const stats = this.rssMonitor.getStats();
    const debugInfo = this.rssMonitor.getDebugInfo();
    
    console.log('  📊 RSS Monitor Stats:');
    console.log(`    Total processed: ${stats.totalProcessed}`);
    console.log(`    Recent links: ${stats.recentLinks}`);
    console.log(`    Top domains: ${JSON.stringify(stats.topDomains, null, 2)}`);
    
    console.log('  🔧 Debug Info:');
    console.log(`    Processed links count: ${debugInfo.processedLinksCount}`);
    console.log(`    Link history count: ${debugInfo.linkHistoryCount}`);
    console.log(`    Has callback: ${debugInfo.hasCallback}`);
    console.log(`    RSS channel names: [${debugInfo.rssChannelNames.join(', ')}]`);
    console.log('');
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 RSS Monitor Test Suite');
    console.log('========================================');
    
    this.testUrlExtraction();
    this.testChannelRecognition();
    await this.testRSSMessageProcessing();
    this.testSystemState();
    
    console.log('✨ Test suite completed');
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  try {
    const testRunner = new RSSTestRunner();
    await testRunner.runAllTests();
  } catch (error) {
    logger.error('Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly (ES module version)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}