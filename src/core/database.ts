/**
 * SQLite Database Manager for AIAS
 * Handles conversation history, user profiles, and memory persistence
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import type { ChatMessage } from '../agents/chat-agent.js';

export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

export interface UserProfile {
  userId: string;
  platform: string;
  displayName?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationRecord {
  id: number;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  userId: string;
  channelId: string;
  platform: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MemoryEntry {
  id: number;
  userId: string;
  platform: string;
  category: string;
  key: string;
  value: string;
  context?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseManager {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    try {
      // Ensure directory exists
      const dbDir = path.dirname(config.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(config.path);
      
      // Configure database
      if (config.enableWAL !== false) {
        this.db.pragma('journal_mode = WAL');
      }
      
      if (config.enableForeignKeys !== false) {
        this.db.pragma('foreign_keys = ON');
      }

      this.initializeTables();
      logger.info(`SQLite database initialized: ${config.path}`);
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    // User profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        display_name TEXT,
        preferences TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, platform)
      )
    `);

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}'
      )
    `);

    // Memory entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, platform, category, key)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON conversations(thread_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user_channel ON conversations(user_id, channel_id, platform);
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memory_user_category ON memory_entries(user_id, platform, category);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at);
    `);

    logger.info('Database tables initialized');
  }

  /**
   * Get or create user profile
   */
  async getOrCreateUserProfile(userId: string, platform: string, displayName?: string): Promise<UserProfile> {
    const stmt = this.db.prepare(`
      SELECT user_id, platform, display_name, preferences, metadata, created_at, updated_at
      FROM user_profiles 
      WHERE user_id = ? AND platform = ?
    `);

    const row = stmt.get(userId, platform) as any;
    
    if (row) {
      return {
        userId: row.user_id,
        platform: row.platform,
        displayName: row.display_name,
        preferences: JSON.parse(row.preferences || '{}'),
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    }

    // Create new profile
    const insertStmt = this.db.prepare(`
      INSERT INTO user_profiles (user_id, platform, display_name, preferences, metadata)
      VALUES (?, ?, ?, '{}', '{}')
    `);

    insertStmt.run(userId, platform, displayName || null);
    
    return this.getOrCreateUserProfile(userId, platform, displayName);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, platform: string, updates: Partial<UserProfile>): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.displayName !== undefined) {
      updateFields.push('display_name = ?');
      params.push(updates.displayName);
    }

    if (updates.preferences !== undefined) {
      updateFields.push('preferences = ?');
      params.push(JSON.stringify(updates.preferences));
    }

    if (updates.metadata !== undefined) {
      updateFields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) return;

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId, platform);

    const stmt = this.db.prepare(`
      UPDATE user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = ? AND platform = ?
    `);

    stmt.run(...params);
  }

  /**
   * Save conversation message
   */
  async saveConversationMessage(message: ChatMessage): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (thread_id, role, content, user_id, channel_id, platform, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const threadId = this.getThreadId(message.platform, message.channelId);
    const result = stmt.run(
      threadId,
      message.role,
      message.content,
      message.userId,
      message.channelId,
      message.platform,
      message.timestamp.toISOString(),
      JSON.stringify(message.metadata || {})
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    platform: string,
    channelId: string,
    limit: number = 50,
    beforeTimestamp?: Date
  ): Promise<ChatMessage[]> {
    const threadId = this.getThreadId(platform, channelId);
    
    let query = `
      SELECT thread_id, role, content, user_id, channel_id, platform, timestamp, metadata
      FROM conversations 
      WHERE thread_id = ?
    `;
    
    const params: any[] = [threadId];
    
    if (beforeTimestamp) {
      query += ' AND timestamp < ?';
      params.push(beforeTimestamp.toISOString());
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      channelId: row.channel_id,
      platform: row.platform,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  /**
   * Save memory entry
   */
  async saveMemory(
    userId: string,
    platform: string,
    category: string,
    key: string,
    value: string,
    context?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_entries (user_id, platform, category, key, value, context, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(userId, platform, category, key, value, context || null);
  }

  /**
   * Get memory entries
   */
  async getMemories(
    userId: string,
    platform: string,
    category?: string,
    limit: number = 100
  ): Promise<MemoryEntry[]> {
    let query = `
      SELECT id, user_id, platform, category, key, value, context, created_at, updated_at
      FROM memory_entries 
      WHERE user_id = ? AND platform = ?
    `;
    
    const params: any[] = [userId, platform];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      category: row.category,
      key: row.key,
      value: row.value,
      context: row.context,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Search memory entries
   */
  async searchMemories(
    userId: string,
    platform: string,
    searchTerm: string,
    category?: string,
    limit: number = 20
  ): Promise<MemoryEntry[]> {
    let query = `
      SELECT id, user_id, platform, category, key, value, context, created_at, updated_at
      FROM memory_entries 
      WHERE user_id = ? AND platform = ? 
      AND (key LIKE ? OR value LIKE ? OR context LIKE ?)
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const params: any[] = [userId, platform, searchPattern, searchPattern, searchPattern];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      category: row.category,
      key: row.key,
      value: row.value,
      context: row.context,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Clean old conversation history
   */
  async cleanOldConversations(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const stmt = this.db.prepare(`
      DELETE FROM conversations 
      WHERE timestamp < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    userProfiles: number;
    conversations: number;
    memoryEntries: number;
    databaseSize: string;
  } {
    const userProfilesStmt = this.db.prepare('SELECT COUNT(*) as count FROM user_profiles');
    const conversationsStmt = this.db.prepare('SELECT COUNT(*) as count FROM conversations');
    const memoryStmt = this.db.prepare('SELECT COUNT(*) as count FROM memory_entries');
    
    const stats = fs.statSync(this.config.path);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    return {
      userProfiles: (userProfilesStmt.get() as any).count,
      conversations: (conversationsStmt.get() as any).count,
      memoryEntries: (memoryStmt.get() as any).count,
      databaseSize: `${sizeMB} MB`,
    };
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
  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }

  /**
   * Run database vacuum for optimization
   */
  vacuum(): void {
    this.db.exec('VACUUM');
    logger.info('Database vacuumed');
  }
}