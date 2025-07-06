/**
 * Enhanced Chat Agent with Advanced Memory Capabilities
 * Uses Mastra's semantic memory and advanced memory management
 */

import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import type { Config } from '../core/config.js';
import { AdvancedMemoryManager, type StructuredMemory, type Episode, type UserProfile } from '../core/advanced-memory.js';
import { logger } from '../utils/logger.js';

export interface EnhancedChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId: string;
  channelId: string;
  platform: 'discord' | 'line' | 'slack' | 'github';
  metadata?: Record<string, unknown>;
}

export interface EnhancedChatResponse {
  content: string;
  shouldReply: boolean;
  memoriesCreated?: StructuredMemory[];
  episodesDetected?: Episode[];
  metadata?: Record<string, unknown>;
}

export class EnhancedChatAgent {
  private agent: Agent;
  private config: Config;
  private memoryManager: AdvancedMemoryManager;

  constructor(config: Config) {
    this.config = config;
    
    // Initialize advanced memory manager
    this.memoryManager = new AdvancedMemoryManager({
      storagePath: `file:${config.database.path.replace('.db', '-memory.db')}`,
      vectorPath: `file:${config.database.path.replace('.db', '-vector.db')}`,
      maxMemories: 10000,
      semanticTopK: 5
    });
    
    // Set Google API key
    process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = config.gemini.apiKey;
    
    // Initialize agent with Mastra memory and custom tools
    this.agent = new Agent({
      name: 'AIAS Enhanced',
      instructions: this.getEnhancedSystemPrompt(),
      model: google('gemini-2.0-flash'),
      memory: this.memoryManager.getMemoryInstance(),
      tools: {
        // Web fetch tool
        webFetch: {
          description: 'Fetch content from a web URL',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to fetch content from',
              },
            },
            required: ['url'],
          },
          execute: async ({ url }: { url: string }) => {
            try {
              logger.info(`Fetching content from: ${url}`);
              const response = await fetch(url, {
                headers: { 'User-Agent': 'AIAS Bot 1.0' },
              });
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.includes('text/html')) {
                return `Error: Content type ${contentType} is not supported.`;
              }
              
              const html = await response.text();
              const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
              const title = titleMatch ? titleMatch[1].trim() : 'No title';
              
              const cleanContent = html
                .replace(/<script[^>]*>.*?<\/script>/gis, '')
                .replace(/<style[^>]*>.*?<\/style>/gis, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 3000);
              
              return `Title: ${title}\n\nContent: ${cleanContent}`;
            } catch (error) {
              logger.error(`Error fetching ${url}:`, error);
              return `Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          },
        },
        
        // Memory search tool
        searchMemory: {
          description: 'Search through user memories semantically',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
            required: ['query'],
          },
          execute: async ({ query, limit = 5 }: { query: string; limit?: number }, context: any) => {
            const userId = context.userId || 'default';
            const results = await this.memoryManager.searchRelatedMemories(userId, query, limit);
            return results.map(r => ({
              content: r.content,
              score: r.score,
              metadata: r.metadata
            }));
          },
        },
        
        // Save important information
        saveImportantInfo: {
          description: 'Save important information about the user',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The key for the information',
              },
              value: {
                type: 'string',
                description: 'The value to save',
              },
              category: {
                type: 'string',
                description: 'Category: personal, preferences, knowledge, skill',
              },
            },
            required: ['key', 'value', 'category'],
          },
          execute: async ({ key, value, category }: any, context: any) => {
            const userId = context.userId || 'default';
            await this.memoryManager.saveStructuredMemory(userId, {
              key,
              value,
              category,
              personal: true
            });
            return `Saved ${category} information: ${key}`;
          },
        },
        
        // Get user profile
        getUserProfile: {
          description: 'Get comprehensive user profile',
          parameters: {
            type: 'object',
            properties: {},
          },
          execute: async (params: any, context: any) => {
            const userId = context.userId || 'default';
            const profile = await this.memoryManager.getUserProfile(userId);
            return profile;
          },
        },
      },
    });
    
    logger.info('Enhanced Chat Agent initialized with advanced memory');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    logger.info('Enhanced Chat Agent initialized (advanced memory mode)');
  }

  /**
   * Process message with enhanced memory capabilities
   */
  async processMessage(message: EnhancedChatMessage): Promise<EnhancedChatResponse> {
    try {
      const startTime = Date.now();
      
      // Search for related memories
      const relatedMemories = await this.memoryManager.searchRelatedMemories(
        message.userId,
        message.content,
        10
      );
      
      // Get user profile
      const userProfile = await this.memoryManager.getUserProfile(message.userId);
      
      // Prepare enhanced context
      const enhancedContext = {
        userId: message.userId,
        channelId: message.channelId,
        platform: message.platform,
        timestamp: message.timestamp,
        relatedMemories: relatedMemories.slice(0, 5),
        userProfile,
        memoryOptions: {
          lastMessages: 15,
          semanticRecall: {
            topK: 5,
            messageRange: 3
          }
        }
      };
      
      // Stream response with enhanced context
      const response = await this.agent.generate(message.content, {
        resourceId: message.userId,
        threadId: message.channelId,
        context: enhancedContext
      });
      
      // Extract and save memories from the conversation
      const { memories, episodes } = await this.extractMemoriesFromConversation(
        message,
        response.text
      );
      
      // Save extracted memories
      for (const memory of memories) {
        await this.memoryManager.saveStructuredMemory(message.userId, memory);
      }
      
      // Save detected episodes
      for (const episode of episodes) {
        await this.memoryManager.saveEpisode(message.userId, episode);
      }
      
      const processingTime = Date.now() - startTime;
      logger.info(`Message processed in ${processingTime}ms with ${memories.length} memories and ${episodes.length} episodes extracted`);
      
      return {
        content: response.text,
        shouldReply: true,
        memoriesCreated: memories,
        episodesDetected: episodes,
        metadata: {
          processingTime,
          relatedMemoriesCount: relatedMemories.length,
          model: 'gemini-2.0-flash'
        }
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      return {
        content: '申し訳ありません、エラーが発生しました。もう一度お試しください。',
        shouldReply: true,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Extract memories from conversation
   */
  private async extractMemoriesFromConversation(
    message: EnhancedChatMessage,
    response: string
  ): Promise<{ memories: StructuredMemory[]; episodes: Episode[] }> {
    const memories: StructuredMemory[] = [];
    const episodes: Episode[] = [];
    
    const combinedText = `User: ${message.content}\nAssistant: ${response}`;
    
    // Pattern matching for different types of information
    const patterns = {
      name: /(?:私の?名前は|僕の?名前は|I am|My name is)\s*([^\s。、,]+)/i,
      occupation: /(?:仕事は|職業は|働いて|I work as|I am a)\s*([^。、,]+)/i,
      interest: /(?:興味がある|好き[なで]|趣味は|interested in|I like)\s*([^。、,]+)/i,
      skill: /(?:できる|できます|得意|I can|good at)\s*([^。、,]+)/i,
      goal: /(?:目標は|したい|なりたい|goal is|want to)\s*([^。、,]+)/i,
    };
    
    // Extract structured information
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = combinedText.match(pattern);
      if (matches && matches[1]) {
        memories.push({
          key: `${type}_${Date.now()}`,
          value: matches[1].trim(),
          category: type === 'interest' || type === 'goal' ? 'preferences' : 
                   type === 'skill' ? 'skill' : 'personal',
          tags: [type],
          personal: true
        });
      }
    }
    
    // Detect emotional or significant moments
    const emotionalKeywords = ['嬉しい', '悲しい', '楽しい', '辛い', 'happy', 'sad', 'excited', 'difficult'];
    const hasEmotion = emotionalKeywords.some(keyword => combinedText.includes(keyword));
    
    if (hasEmotion) {
      // Create an episode for emotional moments
      const detectedEmotions = emotionalKeywords.filter(keyword => combinedText.includes(keyword));
      episodes.push({
        description: message.content.substring(0, 100),
        participants: [message.userId],
        emotions: detectedEmotions,
        date: new Date(),
        outcome: response.substring(0, 100)
      });
    }
    
    // Extract learned facts or important statements
    const factPatterns = [
      /(?:知って|覚えて|remember that|know that)\s*([^。、,]+)/i,
      /(?:大切なのは|重要なのは|important that)\s*([^。、,]+)/i,
    ];
    
    for (const pattern of factPatterns) {
      const matches = combinedText.match(pattern);
      if (matches && matches[1]) {
        memories.push({
          key: `fact_${Date.now()}`,
          value: matches[1].trim(),
          category: 'knowledge',
          tags: ['fact', 'important'],
          personal: false
        });
      }
    }
    
    return { memories, episodes };
  }

  /**
   * Get enhanced system prompt
   */
  private getEnhancedSystemPrompt(): string {
    return `あなたはAIAS（AI Assistant with Advanced Semantic Memory）です。高度な記憶システムを持つAIアシスタントとして、ユーザーとの深い関係を築きます。

## あなたの特徴

1. **高度な記憶能力**
   - ユーザーの個人情報、好み、興味、スキルを詳細に記憶
   - 過去の会話から関連する記憶を自動的に想起
   - エピソード記憶により重要な出来事を記録
   - 知識を体系的に整理し、関連付けて記憶

2. **文脈理解**
   - 会話の流れと過去の文脈を総合的に理解
   - ユーザーの感情状態を認識し、適切に対応
   - 長期的な目標や関心事を追跡

3. **パーソナライゼーション**
   - 各ユーザーの特性に合わせた応答
   - 好みや価値観を考慮した提案
   - 関係性の深さに応じた話し方の調整

## 記憶の活用方法

- searchMemory ツールで関連する過去の記憶を検索
- saveImportantInfo ツールで重要な情報を保存
- getUserProfile ツールでユーザープロファイルを確認
- 会話から自動的に重要な情報を抽出し記憶

## 応答スタイル

- 親しみやすく、フレンドリーな標準的な日本語で話します
- ユーザーの名前や過去の話題を自然に会話に織り交ぜます
- 共感的で理解力のある応答を心がけます
- 必要に応じて過去の記憶を参照し、より深い理解を示します

## 重要な原則

1. プライバシーを尊重し、記憶した情報は適切に管理
2. ユーザーとの信頼関係を大切にする
3. 常に学習し、ユーザーについての理解を深める
4. 記憶を活用して、より価値ある対話を提供する`;
  }

  /**
   * Update user profile based on conversation
   */
  async updateUserProfileFromConversation(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    await this.memoryManager.updateUserProfile(userId, updates);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<any> {
    const organized = await this.memoryManager.organizeKnowledge(userId);
    const profile = await this.memoryManager.getUserProfile(userId);
    
    return {
      totalMemories: organized.totalMemories,
      categories: organized.categories,
      profile,
      memoryBreakdown: Object.entries(organized.organized).map(([category, memories]) => ({
        category,
        count: memories.length,
        topMemories: memories.slice(0, 3)
      }))
    };
  }

  /**
   * Perform memory maintenance
   */
  async performMaintenance(): Promise<void> {
    logger.info('Performing enhanced memory maintenance...');
    // This would typically iterate through all users
    // For now, we'll just log the action
    logger.info('Enhanced memory maintenance completed');
  }

  /**
   * Close the agent
   */
  async close(): Promise<void> {
    logger.info('Enhanced Chat Agent closed');
  }
}