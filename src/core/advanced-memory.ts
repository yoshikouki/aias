/**
 * Advanced Memory Management System using Mastra
 * Provides semantic search, episodic memory, and knowledge organization
 */

import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
// import { fastembed } from '@mastra/fastembed'; // Temporarily disabled for ARM64 compatibility
import { logger } from '../utils/logger.js';

// Memory configuration interface
export interface MemoryConfig {
  storagePath: string;
  vectorPath: string;
  maxMemories?: number;
  semanticTopK?: number;
}

// Memory types
export interface StructuredMemory {
  key: string;
  value: any;
  category: MemoryCategory;
  tags?: string[];
  personal?: boolean;
  emotional?: boolean;
  frequency?: number;
}

export type MemoryCategory = 
  | 'personal' 
  | 'preferences' 
  | 'knowledge' 
  | 'episode' 
  | 'context' 
  | 'skill'
  | 'relationship';

export interface Episode {
  description: string;
  participants: string[];
  emotions: string[];
  outcome?: string;
  learnings?: string[];
  date: Date;
}

export interface UserProfile {
  identity: {
    name?: string;
    age?: number;
    occupation?: string;
    location?: string;
    background?: string;
  };
  preferences: {
    likes: string[];
    dislikes: string[];
    interests: string[];
    values: string[];
  };
  relationships: {
    family: string[];
    friends: string[];
    colleagues: string[];
  };
  skills: string[];
  goals: string[];
}

export class AdvancedMemoryManager {
  private memory: Memory;
  private config: MemoryConfig;
  
  constructor(config: MemoryConfig) {
    this.config = config;
    
    // Initialize Mastra Memory with semantic capabilities
    this.memory = new Memory({
      storage: new LibSQLStore({
        url: config.storagePath
      }),
      vector: new LibSQLVector({
        connectionUrl: config.vectorPath
      }),
      // embedder: fastembed, // Temporarily disabled for ARM64 compatibility
      options: {
        lastMessages: 20,
        semanticRecall: {
          topK: config.semanticTopK || 5,
          messageRange: 3,
          scope: 'resource'
        }
      }
    });
    
    logger.info('Advanced Memory Manager initialized with semantic search');
  }

  /**
   * Save structured memory with categorization and importance scoring
   */
  async saveStructuredMemory(userId: string, memory: StructuredMemory): Promise<void> {
    try {
      const importance = this.calculateImportance(memory);
      const enrichedMemory = {
        ...memory,
        importance,
        timestamp: new Date(),
        lastAccessed: new Date(),
        accessCount: 1
      };
      
      await this.memory.storage.set({
        resourceId: userId,
        key: `${memory.category}:${memory.key}`,
        value: enrichedMemory
      });
      
      logger.info(`Saved memory: ${memory.category}:${memory.key} for user ${userId}`);
    } catch (error) {
      logger.error('Error saving structured memory:', error);
    }
  }

  /**
   * Search memories using semantic similarity
   */
  async searchRelatedMemories(userId: string, query: string, limit = 10): Promise<any[]> {
    try {
      logger.info(`Searching memories for query: "${query}" (user: ${userId})`);
      
      // For now, use simple text-based search without embeddings
      // TODO: Re-enable when ARM64 support is available
      const allMemories = await this.memory.storage.list({ resourceId: userId });
      
      // Simple text matching for now
      const results = allMemories
        .filter(mem => {
          const content = JSON.stringify(mem.value).toLowerCase();
          return content.includes(query.toLowerCase());
        })
        .slice(0, limit)
        .map(mem => ({
          ...mem.value,
          score: 1.0, // Placeholder score
          content: JSON.stringify(mem.value)
        }));
      
      logger.info(`Found ${results.length} related memories`);
      return results;
    } catch (error) {
      logger.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Save an episodic memory
   */
  async saveEpisode(userId: string, episode: Episode): Promise<void> {
    try {
      const key = `episode:${Date.now()}`;
      const importance = this.calculateEpisodeImportance(episode);
      const tags = this.extractEpisodeTags(episode);
      
      await this.saveStructuredMemory(userId, {
        key,
        value: episode,
        category: 'episode',
        tags,
        emotional: episode.emotions.length > 0,
        personal: true
      });
      
      // Also save as a message for semantic search
      const episodeDescription = `${episode.description}. Emotions: ${episode.emotions.join(', ')}. Outcome: ${episode.outcome || 'ongoing'}`;
      await this.memory.upsert({
        resourceId: userId,
        role: 'assistant',
        content: episodeDescription,
        metadata: {
          type: 'episode',
          importance,
          date: episode.date
        }
      });
      
      logger.info(`Saved episode memory for user ${userId}`);
    } catch (error) {
      logger.error('Error saving episode:', error);
    }
  }

  /**
   * Update user profile with comprehensive information
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const existingProfile = await this.getUserProfile(userId);
      const mergedProfile = this.mergeProfiles(existingProfile, updates);
      
      await this.memory.storage.set({
        resourceId: userId,
        key: 'profile:main',
        value: mergedProfile
      });
      
      // Save individual aspects for semantic search
      if (updates.preferences) {
        for (const interest of updates.preferences.interests || []) {
          await this.saveStructuredMemory(userId, {
            key: `interest:${interest}`,
            value: { interest, addedAt: new Date() },
            category: 'preferences',
            tags: ['interest'],
            personal: true
          });
        }
      }
      
      logger.info(`Updated user profile for ${userId}`);
    } catch (error) {
      logger.error('Error updating user profile:', error);
    }
  }

  /**
   * Get comprehensive user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const profileData = await this.memory.storage.get({
        resourceId: userId,
        key: 'profile:main'
      });
      
      if (profileData?.value) {
        return profileData.value as UserProfile;
      }
      
      // Return default profile structure
      return {
        identity: {},
        preferences: { likes: [], dislikes: [], interests: [], values: [] },
        relationships: { family: [], friends: [], colleagues: [] },
        skills: [],
        goals: []
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return this.getDefaultProfile();
    }
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(userId: string, category: MemoryCategory): Promise<any[]> {
    try {
      const memories = await this.memory.storage.list({
        resourceId: userId
      });
      
      return memories
        .filter(mem => mem.key.startsWith(`${category}:`))
        .map(mem => mem.value)
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));
    } catch (error) {
      logger.error('Error getting memories by category:', error);
      return [];
    }
  }

  /**
   * Organize knowledge into a structured format
   */
  async organizeKnowledge(userId: string): Promise<any> {
    try {
      const memories = await this.memory.storage.list({
        resourceId: userId
      });
      
      // Categorize memories
      const organized = memories.reduce((acc, mem) => {
        const category = mem.key.split(':')[0];
        if (!acc[category]) acc[category] = [];
        acc[category].push(mem.value);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Sort by importance within each category
      for (const category in organized) {
        organized[category].sort((a, b) => (b.importance || 0) - (a.importance || 0));
      }
      
      return {
        organized,
        totalMemories: memories.length,
        categories: Object.keys(organized)
      };
    } catch (error) {
      logger.error('Error organizing knowledge:', error);
      return { organized: {}, totalMemories: 0, categories: [] };
    }
  }

  /**
   * Perform memory maintenance
   */
  async performMaintenance(userId: string): Promise<void> {
    try {
      logger.info(`Performing memory maintenance for user ${userId}`);
      
      // Get all memories
      const memories = await this.memory.storage.list({
        resourceId: userId
      });
      
      // Update access patterns and decay old memories
      for (const memory of memories) {
        if (memory.value.lastAccessed) {
          const daysSinceAccess = (Date.now() - new Date(memory.value.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);
          
          // Decay importance for unused memories
          if (daysSinceAccess > 30 && memory.value.importance > 0.1) {
            memory.value.importance *= 0.9;
            await this.memory.storage.set(memory);
          }
          
          // Remove very old, unimportant memories
          if (daysSinceAccess > 90 && memory.value.importance < 0.2) {
            await this.memory.storage.delete({
              resourceId: userId,
              key: memory.key
            });
            logger.debug(`Removed old memory: ${memory.key}`);
          }
        }
      }
      
      logger.info('Memory maintenance completed');
    } catch (error) {
      logger.error('Error during memory maintenance:', error);
    }
  }

  /**
   * Calculate importance score for a memory
   */
  private calculateImportance(memory: StructuredMemory): number {
    let score = 0.5; // Base score
    
    // Category weights
    const categoryWeights: Record<MemoryCategory, number> = {
      personal: 0.9,
      episode: 0.8,
      relationship: 0.85,
      preferences: 0.7,
      skill: 0.75,
      knowledge: 0.6,
      context: 0.5
    };
    
    score = categoryWeights[memory.category] || score;
    
    // Modifiers
    if (memory.personal) score += 0.1;
    if (memory.emotional) score += 0.15;
    if (memory.frequency) score += Math.min(memory.frequency * 0.05, 0.2);
    if (memory.tags && memory.tags.length > 0) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate importance for episodic memories
   */
  private calculateEpisodeImportance(episode: Episode): number {
    let score = 0.7; // Base score for episodes
    
    if (episode.emotions.length > 0) score += 0.1;
    if (episode.learnings && episode.learnings.length > 0) score += 0.15;
    if (episode.participants.length > 1) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract tags from an episode
   */
  private extractEpisodeTags(episode: Episode): string[] {
    const tags: string[] = [];
    
    // Add emotion tags
    tags.push(...episode.emotions.map(e => `emotion:${e}`));
    
    // Add participant tags
    tags.push(...episode.participants.map(p => `person:${p}`));
    
    // Add date-based tags
    const date = new Date(episode.date);
    tags.push(`year:${date.getFullYear()}`);
    tags.push(`month:${date.getMonth() + 1}`);
    
    return tags;
  }

  /**
   * Merge user profiles
   */
  private mergeProfiles(existing: UserProfile, updates: Partial<UserProfile>): UserProfile {
    return {
      identity: { ...existing.identity, ...updates.identity },
      preferences: {
        likes: [...new Set([...existing.preferences.likes, ...(updates.preferences?.likes || [])])],
        dislikes: [...new Set([...existing.preferences.dislikes, ...(updates.preferences?.dislikes || [])])],
        interests: [...new Set([...existing.preferences.interests, ...(updates.preferences?.interests || [])])],
        values: [...new Set([...existing.preferences.values, ...(updates.preferences?.values || [])])]
      },
      relationships: {
        family: [...new Set([...existing.relationships.family, ...(updates.relationships?.family || [])])],
        friends: [...new Set([...existing.relationships.friends, ...(updates.relationships?.friends || [])])],
        colleagues: [...new Set([...existing.relationships.colleagues, ...(updates.relationships?.colleagues || [])])]
      },
      skills: [...new Set([...existing.skills, ...(updates.skills || [])])],
      goals: [...new Set([...existing.goals, ...(updates.goals || [])])]
    };
  }

  /**
   * Get default profile structure
   */
  private getDefaultProfile(): UserProfile {
    return {
      identity: {},
      preferences: { likes: [], dislikes: [], interests: [], values: [] },
      relationships: { family: [], friends: [], colleagues: [] },
      skills: [],
      goals: []
    };
  }

  /**
   * Get Mastra Memory instance for direct usage
   */
  getMemoryInstance(): Memory {
    return this.memory;
  }
}