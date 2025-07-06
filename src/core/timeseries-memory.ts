/**
 * Time-series Memory System for RSS and other temporal data
 * Tracks information over time with trends, patterns, and relevance scoring
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface TimeseriesEntry {
  id?: number;
  source: string;           // 'rss', 'user', 'system'
  category: string;         // 'article', 'discussion', 'announcement'
  title: string;
  content: string;
  url?: string;
  domain?: string;
  tags: string[];
  metadata: Record<string, any>;
  relevanceScore: number;   // 0-1 based on user interests
  timestamp: Date;
  userId?: string;          // If user-specific
  channelId?: string;
  platform?: string;
}

export interface TrendData {
  topic: string;
  count: number;
  avgRelevance: number;
  firstSeen: Date;
  lastSeen: Date;
  peakPeriod: string;
  domains: string[];
}

export interface TimeseriesQuery {
  source?: string;
  category?: string;
  tags?: string[];
  domain?: string;
  minRelevance?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limit?: number;
}

export class TimeseriesMemoryManager {
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
   * Initialize timeseries tables
   */
  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS timeseries_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        domain TEXT,
        tags TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        relevance_score REAL NOT NULL DEFAULT 0.5,
        timestamp DATETIME NOT NULL,
        user_id TEXT,
        channel_id TEXT,
        platform TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_timeseries_timestamp 
        ON timeseries_entries(timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_timeseries_source_category 
        ON timeseries_entries(source, category);
      
      CREATE INDEX IF NOT EXISTS idx_timeseries_domain 
        ON timeseries_entries(domain);
      
      CREATE INDEX IF NOT EXISTS idx_timeseries_relevance 
        ON timeseries_entries(relevance_score DESC);
      
      CREATE INDEX IF NOT EXISTS idx_timeseries_user 
        ON timeseries_entries(user_id, timestamp DESC);

      CREATE TABLE IF NOT EXISTS topic_trends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        period TEXT NOT NULL,           -- 'hour', 'day', 'week', 'month'
        period_start DATETIME NOT NULL,
        mention_count INTEGER DEFAULT 1,
        avg_relevance REAL DEFAULT 0.5,
        domains TEXT DEFAULT '[]',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(topic, period, period_start)
      );

      CREATE INDEX IF NOT EXISTS idx_trends_topic_period 
        ON topic_trends(topic, period, period_start DESC);
    `);
    
    logger.info('Timeseries memory tables initialized');
  }

  /**
   * Save a timeseries entry
   */
  async saveEntry(entry: TimeseriesEntry): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO timeseries_entries 
        (source, category, title, content, url, domain, tags, metadata, relevance_score, 
         timestamp, user_id, channel_id, platform)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        entry.source,
        entry.category,
        entry.title,
        entry.content,
        entry.url || null,
        entry.domain || null,
        JSON.stringify(entry.tags),
        JSON.stringify(entry.metadata),
        entry.relevanceScore,
        entry.timestamp.toISOString(),
        entry.userId || null,
        entry.channelId || null,
        entry.platform || null
      );
      
      const entryId = result.lastInsertRowid as number;
      
      // Update topic trends
      await this.updateTopicTrends(entry, entryId);
      
      logger.info(`Saved timeseries entry: ${entry.title.substring(0, 50)}... (ID: ${entryId})`);
      return entryId;
    } catch (error) {
      logger.error('Error saving timeseries entry:', error);
      throw error;
    }
  }

  /**
   * Query timeseries entries
   */
  async queryEntries(query: TimeseriesQuery): Promise<TimeseriesEntry[]> {
    try {
      let sql = 'SELECT * FROM timeseries_entries WHERE 1=1';
      const params: any[] = [];
      
      if (query.source) {
        sql += ' AND source = ?';
        params.push(query.source);
      }
      
      if (query.category) {
        sql += ' AND category = ?';
        params.push(query.category);
      }
      
      if (query.domain) {
        sql += ' AND domain = ?';
        params.push(query.domain);
      }
      
      if (query.minRelevance !== undefined) {
        sql += ' AND relevance_score >= ?';
        params.push(query.minRelevance);
      }
      
      if (query.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(query.startDate.toISOString());
      }
      
      if (query.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(query.endDate.toISOString());
      }
      
      if (query.userId) {
        sql += ' AND user_id = ?';
        params.push(query.userId);
      }
      
      if (query.tags && query.tags.length > 0) {
        const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
        sql += ` AND (${tagConditions})`;
        params.push(...query.tags.map(tag => `%"${tag}"%`));
      }
      
      sql += ' ORDER BY timestamp DESC';
      
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }
      
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params) as any[];
      
      return results.map(row => ({
        id: row.id,
        source: row.source,
        category: row.category,
        title: row.title,
        content: row.content,
        url: row.url,
        domain: row.domain,
        tags: JSON.parse(row.tags),
        metadata: JSON.parse(row.metadata),
        relevanceScore: row.relevance_score,
        timestamp: new Date(row.timestamp),
        userId: row.user_id,
        channelId: row.channel_id,
        platform: row.platform
      }));
    } catch (error) {
      logger.error('Error querying timeseries entries:', error);
      return [];
    }
  }

  /**
   * Get trending topics for a specific period
   */
  async getTrendingTopics(period: 'hour' | 'day' | 'week' | 'month', limit = 10): Promise<TrendData[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          topic,
          SUM(mention_count) as total_count,
          AVG(avg_relevance) as avg_relevance,
          MIN(period_start) as first_seen,
          MAX(period_start) as last_seen,
          domains
        FROM topic_trends 
        WHERE period = ? 
        AND period_start >= datetime('now', '-1 ${period}')
        GROUP BY topic
        ORDER BY total_count DESC, avg_relevance DESC
        LIMIT ?
      `);
      
      const results = stmt.all(period, limit) as any[];
      
      return results.map(row => ({
        topic: row.topic,
        count: row.total_count,
        avgRelevance: row.avg_relevance,
        firstSeen: new Date(row.first_seen),
        lastSeen: new Date(row.last_seen),
        peakPeriod: period,
        domains: JSON.parse(row.domains || '[]')
      }));
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Get related entries based on content similarity
   */
  async getRelatedEntries(entryId: number, limit = 5): Promise<TimeseriesEntry[]> {
    try {
      // Get the target entry
      const targetEntry = await this.getEntryById(entryId);
      if (!targetEntry) return [];
      
      // Simple similarity based on shared tags and domain
      const stmt = this.db.prepare(`
        SELECT *, 
        (
          CASE WHEN domain = ? THEN 0.3 ELSE 0 END +
          CASE WHEN source = ? THEN 0.2 ELSE 0 END +
          CASE WHEN category = ? THEN 0.1 ELSE 0 END
        ) as similarity_score
        FROM timeseries_entries 
        WHERE id != ?
        AND timestamp >= datetime(?, '-7 days')
        ORDER BY similarity_score DESC, relevance_score DESC
        LIMIT ?
      `);
      
      const results = stmt.all(
        targetEntry.domain,
        targetEntry.source,
        targetEntry.category,
        entryId,
        targetEntry.timestamp.toISOString(),
        limit
      ) as any[];
      
      return results.map(row => ({
        id: row.id,
        source: row.source,
        category: row.category,
        title: row.title,
        content: row.content,
        url: row.url,
        domain: row.domain,
        tags: JSON.parse(row.tags),
        metadata: JSON.parse(row.metadata),
        relevanceScore: row.relevance_score,
        timestamp: new Date(row.timestamp),
        userId: row.user_id,
        channelId: row.channel_id,
        platform: row.platform
      }));
    } catch (error) {
      logger.error('Error getting related entries:', error);
      return [];
    }
  }

  /**
   * Get entry by ID
   */
  async getEntryById(id: number): Promise<TimeseriesEntry | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM timeseries_entries WHERE id = ?');
      const row = stmt.get(id) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        source: row.source,
        category: row.category,
        title: row.title,
        content: row.content,
        url: row.url,
        domain: row.domain,
        tags: JSON.parse(row.tags),
        metadata: JSON.parse(row.metadata),
        relevanceScore: row.relevance_score,
        timestamp: new Date(row.timestamp),
        userId: row.user_id,
        channelId: row.channel_id,
        platform: row.platform
      };
    } catch (error) {
      logger.error('Error getting entry by ID:', error);
      return null;
    }
  }

  /**
   * Update topic trends
   */
  private async updateTopicTrends(entry: TimeseriesEntry, entryId: number): Promise<void> {
    try {
      // Extract topics from tags and title
      const topics = [...entry.tags];
      
      // Add domain as a topic
      if (entry.domain) {
        topics.push(entry.domain);
      }
      
      // Extract key terms from title (simple approach)
      const titleWords = entry.title.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5); // Top 5 words
      topics.push(...titleWords);
      
      const periods = ['hour', 'day', 'week', 'month'];
      
      for (const topic of topics) {
        for (const period of periods) {
          const periodStart = this.getPeriodStart(entry.timestamp, period);
          
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO topic_trends 
            (topic, period, period_start, mention_count, avg_relevance, domains, last_updated)
            VALUES (
              ?, ?, ?, 
              COALESCE((SELECT mention_count FROM topic_trends WHERE topic = ? AND period = ? AND period_start = ?), 0) + 1,
              (COALESCE((SELECT avg_relevance * mention_count FROM topic_trends WHERE topic = ? AND period = ? AND period_start = ?), 0) + ?) / 
              (COALESCE((SELECT mention_count FROM topic_trends WHERE topic = ? AND period = ? AND period_start = ?), 0) + 1),
              json_insert(COALESCE((SELECT domains FROM topic_trends WHERE topic = ? AND period = ? AND period_start = ?), '[]'), '$[#]', ?),
              CURRENT_TIMESTAMP
            )
          `);
          
          stmt.run(
            topic, period, periodStart.toISOString(),
            topic, period, periodStart.toISOString(),
            topic, period, periodStart.toISOString(), entry.relevanceScore,
            topic, period, periodStart.toISOString(),
            topic, period, periodStart.toISOString(), entry.domain || 'unknown'
          );
        }
      }
    } catch (error) {
      logger.error('Error updating topic trends:', error);
    }
  }

  /**
   * Get period start for trending calculations
   */
  private getPeriodStart(timestamp: Date, period: string): Date {
    const date = new Date(timestamp);
    
    switch (period) {
      case 'hour':
        date.setMinutes(0, 0, 0);
        break;
      case 'day':
        date.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        break;
      case 'month':
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
    }
    
    return date;
  }

  /**
   * Calculate relevance score based on user interests
   */
  calculateRelevanceScore(entry: Omit<TimeseriesEntry, 'relevanceScore'>, userInterests: string[] = []): number {
    let score = 0.5; // Base score
    
    // Domain-based scoring
    const techDomains = ['github.com', 'stackoverflow.com', 'qiita.com', 'zenn.dev', 'dev.to'];
    if (entry.domain && techDomains.includes(entry.domain)) {
      score += 0.2;
    }
    
    // Tag-based scoring
    const techTags = ['typescript', 'javascript', 'react', 'node.js', 'ai', 'machine-learning'];
    const matchingTags = entry.tags.filter(tag => 
      techTags.includes(tag.toLowerCase()) || 
      userInterests.some(interest => tag.toLowerCase().includes(interest.toLowerCase()))
    );
    score += matchingTags.length * 0.1;
    
    // Recency bonus
    const hoursSincePosted = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSincePosted < 24) {
      score += 0.1 * (1 - hoursSincePosted / 24);
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM timeseries_entries');
      const sourcesStmt = this.db.prepare(`
        SELECT source, COUNT(*) as count 
        FROM timeseries_entries 
        GROUP BY source 
        ORDER BY count DESC
      `);
      const domainsStmt = this.db.prepare(`
        SELECT domain, COUNT(*) as count 
        FROM timeseries_entries 
        WHERE domain IS NOT NULL
        GROUP BY domain 
        ORDER BY count DESC 
        LIMIT 10
      `);
      const recentStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM timeseries_entries 
        WHERE timestamp >= datetime('now', '-1 day')
      `);
      
      const total = (totalStmt.get() as any).total;
      const sources = sourcesStmt.all() as any[];
      const domains = domainsStmt.all() as any[];
      const recent = (recentStmt.get() as any).count;
      
      return {
        totalEntries: total,
        recentEntries: recent,
        sourceBreakdown: sources,
        topDomains: domains
      };
    } catch (error) {
      logger.error('Error getting timeseries stats:', error);
      return { totalEntries: 0, recentEntries: 0, sourceBreakdown: [], topDomains: [] };
    }
  }

  /**
   * Cleanup old entries
   */
  async cleanup(retentionDays = 90): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM timeseries_entries 
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `);
      
      const result = stmt.run(retentionDays);
      
      // Also cleanup old trends
      const trendStmt = this.db.prepare(`
        DELETE FROM topic_trends 
        WHERE period_start < datetime('now', '-' || ? || ' days')
      `);
      
      trendStmt.run(retentionDays);
      
      logger.info(`Cleaned up ${result.changes} old timeseries entries`);
    } catch (error) {
      logger.error('Error during timeseries cleanup:', error);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Timeseries memory database closed');
  }
}