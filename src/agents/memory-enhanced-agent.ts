/**
 * Memory-Enhanced Chat Agent using Simple Memory System
 * Provides advanced memory capabilities without requiring embeddings
 */

import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import type { Config } from '../core/config.js';
import { SimpleMemoryManager, type SimpleUserProfile } from '../core/simple-memory.js';
import { logger } from '../utils/logger.js';

export interface MemoryEnhancedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId: string;
  channelId: string;
  platform: 'discord' | 'line' | 'slack' | 'github';
  metadata?: Record<string, unknown>;
}

export interface MemoryEnhancedResponse {
  content: string;
  shouldReply: boolean;
  memoriesExtracted?: number;
  profileUpdated?: boolean;
  metadata?: Record<string, unknown>;
}

export class MemoryEnhancedAgent {
  private agent: Agent;
  private config: Config;
  private memoryManager: SimpleMemoryManager;

  constructor(config: Config) {
    this.config = config;
    
    // Initialize simple memory manager
    this.memoryManager = new SimpleMemoryManager(
      config.database.path.replace('.db', '-enhanced.db')
    );
    
    // Set Google API key
    process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = config.gemini.apiKey;
    
    // Initialize agent with memory-aware system prompt
    this.agent = new Agent({
      name: 'AIAS Memory Enhanced',
      instructions: this.getMemoryEnhancedSystemPrompt(),
      model: google('gemini-2.0-flash'),
    });
    
    logger.info('Memory-Enhanced Chat Agent initialized');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    logger.info('Memory-Enhanced Chat Agent ready');
  }

  /**
   * Process message with memory enhancement
   */
  async processMessage(message: MemoryEnhancedMessage): Promise<MemoryEnhancedResponse> {
    try {
      const startTime = Date.now();
      
      // Search for related memories
      const relatedMemories = await this.memoryManager.searchMemories(
        message.userId,
        message.content,
        5
      );
      
      // Get user profile
      const userProfile = await this.memoryManager.getUserProfile(message.userId);
      
      // Build context from memories
      const memoryContext = this.buildMemoryContext(relatedMemories, userProfile);
      
      // Create enhanced prompt with memory context
      const enhancedContent = `
${memoryContext}

ユーザーからのメッセージ: ${message.content}

上記の記憶情報を考慮して、親しみやすく返答してください。`;
      
      // Generate response
      const response = await this.agent.generate(enhancedContent);
      
      // Extract memories from the conversation
      const extractedMemories = this.memoryManager.extractMemoriesFromText(
        `${message.content} ${response.text}`
      );
      
      // Save extracted memories
      let memoriesSaved = 0;
      for (const memory of extractedMemories) {
        const importance = this.memoryManager.calculateImportance({
          category: memory.category,
          tags: memory.tags,
          personal: memory.category === 'personal'
        });
        
        await this.memoryManager.saveMemory({
          userId: message.userId,
          category: memory.category,
          key: memory.key,
          value: memory.value,
          importance,
          tags: memory.tags
        });
        memoriesSaved++;
      }
      
      // Update user profile if new information was found
      let profileUpdated = false;
      if (extractedMemories.length > 0) {
        profileUpdated = await this.updateProfileFromMemories(
          message.userId,
          extractedMemories
        );
      }
      
      const processingTime = Date.now() - startTime;
      logger.info(`Message processed in ${processingTime}ms with ${memoriesSaved} memories extracted`);
      
      return {
        content: response.text,
        shouldReply: true,
        memoriesExtracted: memoriesSaved,
        profileUpdated,
        metadata: {
          processingTime,
          relatedMemoriesFound: relatedMemories.length,
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
   * Build memory context string for the AI
   */
  private buildMemoryContext(memories: any[], profile: SimpleUserProfile): string {
    let context = '## ユーザーについての記憶\n\n';
    
    // Add profile information
    if (profile.name) {
      context += `- 名前: ${profile.name}\n`;
    }
    if (profile.occupation) {
      context += `- 職業: ${profile.occupation}\n`;
    }
    if (profile.interests.length > 0) {
      context += `- 興味・趣味: ${profile.interests.join('、')}\n`;
    }
    if (profile.skills.length > 0) {
      context += `- スキル: ${profile.skills.join('、')}\n`;
    }
    if (profile.goals.length > 0) {
      context += `- 目標: ${profile.goals.join('、')}\n`;
    }
    
    // Add recent memories
    if (memories.length > 0) {
      context += '\n## 関連する過去の記憶\n';
      memories.forEach((memory, index) => {
        const value = typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value);
        context += `${index + 1}. [${memory.category}] ${value}\n`;
      });
    }
    
    return context;
  }

  /**
   * Update user profile from extracted memories
   */
  private async updateProfileFromMemories(
    userId: string,
    memories: Array<{key: string; value: string; category: string; tags: string[]}>
  ): Promise<boolean> {
    const currentProfile = await this.memoryManager.getUserProfile(userId);
    let updated = false;
    
    const updates: Partial<SimpleUserProfile> = {
      interests: [...currentProfile.interests],
      skills: [...currentProfile.skills],
      goals: [...currentProfile.goals],
      preferences: { ...currentProfile.preferences }
    };
    
    for (const memory of memories) {
      if (memory.category === 'personal' && memory.key.startsWith('name_')) {
        updates.name = memory.value;
        updated = true;
      } else if (memory.category === 'personal' && memory.key.startsWith('occupation_')) {
        updates.occupation = memory.value;
        updated = true;
      } else if (memory.category === 'preferences' && memory.key.startsWith('interest_')) {
        if (!updates.interests!.includes(memory.value)) {
          updates.interests!.push(memory.value);
          updated = true;
        }
      } else if (memory.category === 'skills' && memory.key.startsWith('skill_')) {
        if (!updates.skills!.includes(memory.value)) {
          updates.skills!.push(memory.value);
          updated = true;
        }
      } else if (memory.category === 'goals' && memory.key.startsWith('goal_')) {
        if (!updates.goals!.includes(memory.value)) {
          updates.goals!.push(memory.value);
          updated = true;
        }
      }
    }
    
    if (updated) {
      await this.memoryManager.updateUserProfile(userId, updates as SimpleUserProfile);
    }
    
    return updated;
  }

  /**
   * Get memory-enhanced system prompt
   */
  private getMemoryEnhancedSystemPrompt(): string {
    return `あなたはAIAS（AI Assistant with Simple Memory）です。高度な記憶システムを持つAIアシスタントとして、ユーザーとの会話を記憶し、パーソナライズされた応答を提供します。

## 特徴

1. **記憶能力**
   - ユーザーの名前、職業、趣味、スキル、目標などを記憶
   - 過去の会話から重要な情報を抽出して保存
   - 会話の文脈を理解し、関連する記憶を活用

2. **パーソナライゼーション**
   - 各ユーザーの特性に合わせた応答
   - 記憶した情報を自然に会話に織り込む
   - ユーザーの興味や目標に基づいた提案

3. **情報抽出**
   - 会話から自動的に重要な情報を検出
   - 個人情報、好み、スキル、目標などをカテゴリ分けして記憶
   - 時間とともに深まる理解

## 応答スタイル

- 親しみやすく、フレンドリーな標準的な日本語で話します
- ユーザーの名前や過去の話題を自然に会話に含めます
- 共感的で理解力のある応答を心がけます
- 記憶している情報を適切なタイミングで参照します

## 重要な原則

1. プライバシーを尊重し、記憶した情報は適切に管理
2. ユーザーとの信頼関係を大切にする
3. 常に学習し、ユーザーについての理解を深める
4. 記憶を活用して、より価値ある対話を提供する`;
  }

  /**
   * Manual memory save
   */
  async saveMemory(
    userId: string,
    category: string,
    key: string,
    value: any,
    tags: string[] = []
  ): Promise<void> {
    const importance = this.memoryManager.calculateImportance({
      category,
      tags,
      personal: category === 'personal'
    });
    
    await this.memoryManager.saveMemory({
      userId,
      category,
      key,
      value,
      importance,
      tags
    });
  }

  /**
   * Search user memories
   */
  async searchMemories(userId: string, query: string, limit = 10): Promise<any[]> {
    return await this.memoryManager.searchMemories(userId, query, limit);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<any> {
    const stats = await this.memoryManager.getMemoryStats(userId);
    const profile = await this.memoryManager.getUserProfile(userId);
    
    return {
      ...stats,
      profile
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<SimpleUserProfile>): Promise<void> {
    const currentProfile = await this.memoryManager.getUserProfile(userId);
    const updatedProfile: SimpleUserProfile = {
      name: updates.name || currentProfile.name,
      occupation: updates.occupation || currentProfile.occupation,
      interests: [...new Set([...currentProfile.interests, ...(updates.interests || [])])],
      skills: [...new Set([...currentProfile.skills, ...(updates.skills || [])])],
      goals: [...new Set([...currentProfile.goals, ...(updates.goals || [])])],
      preferences: { ...currentProfile.preferences, ...(updates.preferences || {}) }
    };
    
    await this.memoryManager.updateUserProfile(userId, updatedProfile);
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(userId: string, category: string): Promise<any[]> {
    return await this.memoryManager.getMemoriesByCategory(userId, category);
  }

  /**
   * Close the agent
   */
  async close(): Promise<void> {
    this.memoryManager.close();
    logger.info('Memory-Enhanced Chat Agent closed');
  }
}