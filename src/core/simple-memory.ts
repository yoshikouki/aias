/**
 * Simple Memory Management System
 * A lightweight implementation without embeddings for ARM64 compatibility
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface SimpleMemory {
  userId: string;
  category: string;
  key: string;
  value: any;
  importance: number;
  tags: string[];
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface SimpleUserProfile {
  name?: string;
  occupation?: string;
  interests: string[];
  skills: string[];
  goals: string[];
  preferences: Record<string, any>;
}

export class SimpleMemoryManager {
  private db: Database.Database;
  
  constructor(databasePath: string) {
    // Ensure directory exists
    const dbDir = path.dirname(databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(databasePath);
    
    // Configure database
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    this.initializeTables();
  }

  /**
   * Initialize memory tables
   */
  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enhanced_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        importance REAL DEFAULT 0.5,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        UNIQUE(user_id, category, key)
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_category 
        ON enhanced_memories(user_id, category);
      
      CREATE INDEX IF NOT EXISTS idx_memories_importance 
        ON enhanced_memories(user_id, importance DESC);

      CREATE TABLE IF NOT EXISTS user_profiles_enhanced (
        user_id TEXT PRIMARY KEY,
        profile_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    logger.info('Simple memory tables initialized');
  }

  /**
   * Save a memory
   */
  async saveMemory(memory: Omit<SimpleMemory, 'createdAt' | 'lastAccessed' | 'accessCount'>): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO enhanced_memories 
        (user_id, category, key, value, importance, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        memory.userId,
        memory.category,
        memory.key,
        JSON.stringify(memory.value),
        memory.importance,
        JSON.stringify(memory.tags)
      );
      
      logger.info(`Saved memory: ${memory.category}:${memory.key} for user ${memory.userId}`);
    } catch (error) {
      logger.error('Error saving memory:', error);
    }
  }

  /**
   * Search memories by keywords
   */
  async searchMemories(userId: string, query: string, limit = 10): Promise<SimpleMemory[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM enhanced_memories
        WHERE user_id = ? 
        AND (value LIKE ? OR key LIKE ? OR tags LIKE ?)
        ORDER BY importance DESC, last_accessed DESC
        LIMIT ?
      `);
      
      const searchPattern = `%${query}%`;
      const results = stmt.all(userId, searchPattern, searchPattern, searchPattern, limit) as any[];
      
      // Update access count and time
      const updateStmt = this.db.prepare(`
        UPDATE enhanced_memories 
        SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE id = ?
      `);
      
      return results.map(row => {
        updateStmt.run(row.id);
        return {
          userId: row.user_id,
          category: row.category,
          key: row.key,
          value: JSON.parse(row.value),
          importance: row.importance,
          tags: JSON.parse(row.tags || '[]'),
          createdAt: new Date(row.created_at),
          lastAccessed: new Date(row.last_accessed),
          accessCount: row.access_count
        };
      });
    } catch (error) {
      logger.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(userId: string, category: string): Promise<SimpleMemory[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM enhanced_memories
        WHERE user_id = ? AND category = ?
        ORDER BY importance DESC, last_accessed DESC
      `);
      
      const results = stmt.all(userId, category) as any[];
      
      return results.map(row => ({
        userId: row.user_id,
        category: row.category,
        key: row.key,
        value: JSON.parse(row.value),
        importance: row.importance,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: new Date(row.created_at),
        lastAccessed: new Date(row.last_accessed),
        accessCount: row.access_count
      }));
    } catch (error) {
      logger.error('Error getting memories by category:', error);
      return [];
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profile: SimpleUserProfile): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_profiles_enhanced (user_id, profile_data)
        VALUES (?, ?)
      `);
      
      stmt.run(userId, JSON.stringify(profile));
      
      // Also save individual elements as searchable memories
      if (profile.name) {
        await this.saveMemory({
          userId,
          category: 'personal',
          key: 'name',
          value: profile.name,
          importance: 0.9,
          tags: ['identity', 'name']
        });
      }
      
      if (profile.occupation) {
        await this.saveMemory({
          userId,
          category: 'personal',
          key: 'occupation',
          value: profile.occupation,
          importance: 0.8,
          tags: ['identity', 'work']
        });
      }
      
      for (const interest of profile.interests) {
        await this.saveMemory({
          userId,
          category: 'preferences',
          key: `interest_${interest}`,
          value: interest,
          importance: 0.7,
          tags: ['interest']
        });
      }
      
      for (const skill of profile.skills) {
        await this.saveMemory({
          userId,
          category: 'skills',
          key: `skill_${skill}`,
          value: skill,
          importance: 0.75,
          tags: ['skill', 'ability']
        });
      }
      
      logger.info(`Updated profile for user ${userId}`);
    } catch (error) {
      logger.error('Error updating user profile:', error);
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<SimpleUserProfile> {
    try {
      const stmt = this.db.prepare(`
        SELECT profile_data FROM user_profiles_enhanced
        WHERE user_id = ?
      `);
      
      const result = stmt.get(userId) as any;
      
      if (result) {
        return JSON.parse(result.profile_data);
      }
      
      // Return default profile
      return {
        interests: [],
        skills: [],
        goals: [],
        preferences: {}
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return {
        interests: [],
        skills: [],
        goals: [],
        preferences: {}
      };
    }
  }

  /**
   * Extract memories from text
   */
  extractMemoriesFromText(text: string): Array<{key: string; value: string; category: string; tags: string[]}> {
    const memories: Array<{key: string; value: string; category: string; tags: string[]}> = [];
    
    // Pattern matching for different types of information
    const patterns = [
      {
        pattern: /(?:私の?名前は|僕の?名前は|I am|My name is)\s*([^\s。、,]+)/gi,
        category: 'personal',
        keyPrefix: 'name',
        tags: ['identity', 'name']
      },
      {
        pattern: /(?:仕事は|職業は|働いて|I work as|I am a)\s*([^。、,]+)/gi,
        category: 'personal',
        keyPrefix: 'occupation',
        tags: ['identity', 'work']
      },
      {
        pattern: /(?:興味がある|好き[なで]|趣味は|interested in|I like)\s*([^。、,]+)/gi,
        category: 'preferences',
        keyPrefix: 'interest',
        tags: ['interest', 'preference']
      },
      {
        pattern: /(?:できる|できます|得意|I can|good at)\s*([^。、,]+)/gi,
        category: 'skills',
        keyPrefix: 'skill',
        tags: ['skill', 'ability']
      },
      {
        pattern: /(?:目標は|したい|なりたい|goal is|want to)\s*([^。、,]+)/gi,
        category: 'goals',
        keyPrefix: 'goal',
        tags: ['goal', 'aspiration']
      },
      {
        pattern: /(?:覚えて|remember that|知って)\s*[:：]?\s*([^。、,]+)/gi,
        category: 'knowledge',
        keyPrefix: 'fact',
        tags: ['fact', 'knowledge']
      }
    ];
    
    for (const { pattern, category, keyPrefix, tags } of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          memories.push({
            key: `${keyPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            value: match[1].trim(),
            category,
            tags
          });
        }
      }
    }
    
    return memories;
  }

  /**
   * Calculate importance based on various factors
   */
  calculateImportance(memory: {category: string; tags: string[]; emotional?: boolean; personal?: boolean}): number {
    let score = 0.5; // Base score
    
    // Category weights
    const categoryWeights: Record<string, number> = {
      personal: 0.9,
      skills: 0.75,
      preferences: 0.7,
      goals: 0.8,
      knowledge: 0.6,
      episode: 0.85
    };
    
    score = categoryWeights[memory.category] || score;
    
    // Modifiers
    if (memory.personal) score += 0.1;
    if (memory.emotional) score += 0.15;
    if (memory.tags.includes('important')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<any> {
    try {
      const categoriesStmt = this.db.prepare(`
        SELECT category, COUNT(*) as count, AVG(importance) as avg_importance
        FROM enhanced_memories
        WHERE user_id = ?
        GROUP BY category
      `);
      
      const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as total FROM enhanced_memories WHERE user_id = ?
      `);
      
      const categories = categoriesStmt.all(userId) as any[];
      const total = (totalStmt.get(userId) as any).total;
      
      return {
        totalMemories: total,
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat.count,
          avgImportance: cat.avg_importance
        }))
      };
    } catch (error) {
      logger.error('Error getting memory stats:', error);
      return { totalMemories: 0, categories: [] };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}