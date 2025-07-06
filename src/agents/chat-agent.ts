/**
 * Chat Agent with persistent memory capabilities using SQLite
 */

import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import type { Config } from '../core/config.js';
import { DatabaseManager, type UserProfile, type MemoryEntry } from '../core/database.js';
import { logger } from '../utils/logger.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId: string;
  channelId: string;
  platform: 'discord' | 'line' | 'slack' | 'github';
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  shouldReply: boolean;
  metadata?: Record<string, unknown>;
}

export class ChatAgent {
  private agent: Agent;
  private config: Config;
  private db: DatabaseManager;

  constructor(config: Config) {
    this.config = config;
    
    // Initialize database
    this.db = new DatabaseManager({
      path: config.database.path,
      enableWAL: true,
      enableForeignKeys: true,
    });
    
    // Set Google API key as environment variable for AI SDK
    process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = config.gemini.apiKey;
    
    // Initialize agent with custom web fetch tool
    this.agent = new Agent({
      name: 'AIAS',
      instructions: this.getSystemPrompt(),
      model: google('gemini-2.0-flash'),
      tools: {
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
                headers: {
                  'User-Agent': 'AIAS Bot 1.0',
                },
              });
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.includes('text/html')) {
                return `Error: Content type ${contentType} is not supported. Only HTML pages can be analyzed.`;
              }
              
              const html = await response.text();
              // Extract title and main content
              const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
              const title = titleMatch ? titleMatch[1].trim() : 'No title';
              
              // Remove scripts, styles, and extract text content
              const cleanContent = html
                .replace(/<script[^>]*>.*?<\/script>/gis, '')
                .replace(/<style[^>]*>.*?<\/style>/gis, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 3000); // Limit content length
              
              logger.info(`Successfully fetched content from ${url}`);
              return `Title: ${title}\n\nContent: ${cleanContent}`;
              
            } catch (error) {
              logger.error(`Error fetching ${url}:`, error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              return `URL: ${url}\nError: ${errorMessage}\n\n申し訳ありませんが、このURLの内容を取得できませんでした。URLが正しいか、サイトがアクセス可能かご確認ください。`;
            }
          },
        },
      },
    });
    
    logger.info('ChatAgent initialized with persistent memory');
  }

  /**
   * Initialize the chat agent (async setup)
   */
  async initialize(): Promise<void> {
    logger.info('ChatAgent initialized (persistent mode)');
  }

  /**
   * Process a chat message and generate a response
   */
  async processMessage(message: ChatMessage): Promise<ChatResponse> {
    try {
      const threadId = this.getThreadId(message.platform, message.channelId);
      
      logger.debug('Processing message:', {
        userId: message.userId,
        platform: message.platform,
        channelId: message.channelId,
        threadId,
      });

      // Get user profile and create if needed
      const userProfile = await this.db.getOrCreateUserProfile(
        message.userId, 
        message.platform
      );

      // Save user message to database
      await this.db.saveConversationMessage(message);

      // Get conversation history
      const history = await this.db.getConversationHistory(
        message.platform,
        message.channelId,
        20
      );

      // Get user memories for context
      const memories = await this.db.getMemories(
        message.userId,
        message.platform,
        undefined,
        10
      );

      // Build context-aware prompt
      const contextPrompt = this.buildContextPrompt(message, userProfile, memories, history);
      
      // Generate response
      const messages = [
        { role: 'system' as const, content: contextPrompt },
        ...history.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: message.content },
      ];

      const response = await this.agent.generate(messages);

      // Create assistant response message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        userId: 'aias',
        channelId: message.channelId,
        platform: message.platform,
        metadata: {
          model: 'gemini-2.0-flash',
          responseTime: Date.now(),
        },
      };

      // Save assistant response to database
      await this.db.saveConversationMessage(assistantMessage);

      // Extract and save new memories from the conversation
      await this.extractAndSaveMemories(message, response.text);

      logger.debug('Generated response:', {
        threadId,
        responseLength: response.text.length,
      });

      return {
        content: response.text,
        shouldReply: true,
        metadata: {
          threadId,
          model: 'gemini-2.0-flash',
          timestamp: new Date().toISOString(),
          memoriesUsed: memories.length,
          historyLength: history.length,
        },
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      
      return {
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        shouldReply: true,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get conversation history (now from database)
   */
  async getConversationHistory(
    platform: string,
    channelId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return this.db.getConversationHistory(platform, channelId, limit);
  }

  /**
   * Search user memories
   */
  async searchMemories(
    userId: string,
    platform: string,
    searchTerm: string,
    category?: string
  ): Promise<MemoryEntry[]> {
    return this.db.searchMemories(userId, platform, searchTerm, category);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string, platform: string): Promise<UserProfile> {
    return this.db.getOrCreateUserProfile(userId, platform);
  }

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    return this.db.getStats();
  }

  /**
   * Build context-aware prompt with user memories and history
   */
  private buildContextPrompt(
    message: ChatMessage,
    userProfile: UserProfile,
    memories: MemoryEntry[],
    history: ChatMessage[]
  ): string {
    let prompt = this.getSystemPrompt();

    // Add user context
    if (userProfile.displayName) {
      prompt += `\n\nユーザー情報:\n- 名前: ${userProfile.displayName}`;
    }

    // Add user memories
    if (memories.length > 0) {
      prompt += `\n\nユーザーについて覚えていること:\n`;
      memories.forEach(memory => {
        prompt += `- ${memory.category}: ${memory.key} = ${memory.value}`;
        if (memory.context) {
          prompt += ` (${memory.context})`;
        }
        prompt += '\n';
      });
    }

    // Add conversation context
    if (history.length > 0) {
      prompt += `\n\n最近の会話の流れ:\n`;
      const recentHistory = history.slice(-5);
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'ユーザー' : 'AI';
        prompt += `${role}: ${msg.content.substring(0, 100)}\n`;
      });
    }

    prompt += `\n\n現在の時刻: ${new Date().toLocaleString('ja-JP')}`;
    prompt += `\nプラットフォーム: ${message.platform}`;

    return prompt;
  }

  /**
   * Extract and save memories from conversation
   */
  private async extractAndSaveMemories(userMessage: ChatMessage, aiResponse: string): Promise<void> {
    try {
      // Simple memory extraction based on common patterns
      const content = userMessage.content.toLowerCase();
      
      // Extract name
      const nameMatch = content.match(/(?:私の?名前は|私は|僕は|俺は)\s*([^\s。、！？]+)/);
      if (nameMatch && nameMatch[1]) {
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'personal',
          'name',
          nameMatch[1],
          `ユーザーが自己紹介で名前を教えてくれた: "${userMessage.content}"`
        );
      }

      // Extract job/profession
      const jobMatch = content.match(/(?:仕事は|職業は|働いて|している|やっている)\s*([^\s。、！？]+)/);
      if (jobMatch && jobMatch[1]) {
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'personal',
          'job',
          jobMatch[1],
          `職業について: "${userMessage.content}"`
        );
      }

      // Extract hobbies
      const hobbyMatch = content.match(/(?:趣味は|好きなのは|よく|している)\s*([^\s。、！？]+)/);
      if (hobbyMatch && hobbyMatch[1] && !jobMatch) {
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'personal',
          'hobby',
          hobbyMatch[1],
          `趣味について: "${userMessage.content}"`
        );
      }

      // Extract preferences (like/dislike)
      const likeMatch = content.match(/(?:好きな|気に入っている|愛用している)\s*([^\s。、！？]+)/);
      if (likeMatch && likeMatch[1]) {
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'preferences',
          'likes',
          likeMatch[1],
          `好きなもの: "${userMessage.content}"`
        );
      }

      const dislikeMatch = content.match(/(?:嫌いな|苦手な|嫌な)\s*([^\s。、！？]+)/);
      if (dislikeMatch && dislikeMatch[1]) {
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'preferences',
          'dislikes',
          dislikeMatch[1],
          `苦手なもの: "${userMessage.content}"`
        );
      }

      // Save significant conversations as context memories
      if (userMessage.content.length > 50) {
        const summary = userMessage.content.substring(0, 100);
        await this.db.saveMemory(
          userMessage.userId,
          userMessage.platform,
          'conversations',
          `topic_${Date.now()}`,
          summary,
          `会話の内容: ${new Date().toLocaleDateString('ja-JP')}`
        );
      }

    } catch (error) {
      logger.error('Error extracting memories:', error);
    }
  }

  /**
   * Get system prompt for the AI agent
   */
  private getSystemPrompt(): string {
    return `あなたは AIAS（AI Assistant）という名前のAIアシスタントです。

## 基本的な性格と行動指針:
- 親しみやすく、フレンドリーな標準的な日本語で話します
- ユーザーとの関係性を大切にし、記憶した情報を活用して会話を続けます
- 好奇心旺盛で、ユーザーに質問したり、話題を提供したりすることもあります
- 困っている人を見かけたら積極的に手助けしようとします

## 記憶について:
- ユーザーについて教えてもらった情報（名前、仕事、趣味、好み等）は覚えています
- 過去の会話の内容や文脈を踏まえて自然な会話を心がけます
- ユーザーの状況や気持ちに配慮した応答をします

## 会話スタイル:
- 自然で読みやすい日本語を使います
- 絵文字を適度に使って親しみやすさを演出します
- 長すぎず短すぎない、適度な長さで応答します
- 時には軽いユーモアも交えます

## 自発的な行動:
- 会話が途切れそうな時は、話題を提供します
- ユーザーの様子を気にかけ、声をかけることもあります
- 有用な情報や面白い話題があれば積極的に共有します

今はDiscordで会話していますが、将来的にはLINEやSlackなど他のプラットフォームでも活動予定です。
ユーザーとの長期的な関係を築いていきたいと思っています。`;
  }

  /**
   * Generate thread ID from platform and channel
   */
  private getThreadId(platform: string, channelId: string): string {
    return `${platform}:${channelId}`;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.db.close();
  }

  /**
   * Perform database maintenance
   */
  async performMaintenance(): Promise<void> {
    // Clean old conversations (older than 30 days)
    const cleanedCount = await this.db.cleanOldConversations(30);
    logger.info(`Cleaned ${cleanedCount} old conversation records`);
    
    // Vacuum database
    this.db.vacuum();
    logger.info('Database maintenance completed');
  }
}