/**
 * RSS Channel Monitor
 * Monitors RSS channel for links and provides intelligent commentary
 */

import type { ChatAgent } from '../agents/chat-agent.js';
import { TimeseriesMemoryManager, type TimeseriesEntry } from '../core/timeseries-memory.js';
import { logger } from '../utils/logger.js';

export interface LinkInfo {
  url: string;
  title?: string;
  content?: string;
  domain: string;
  timestamp: Date;
  postedBy: string;
  channelId: string;
  platform: string;
}

export interface LinkAnalysis {
  summary: string;
  keyPoints: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  relevantTopics: string[];
  commentary: string;
  discussionPrompts: string[];
}

export class RSSMonitor {
  private chatAgent: ChatAgent;
  private processedLinks: Set<string> = new Set();
  private linkHistory: LinkInfo[] = [];
  private readonly RSS_CHANNEL_NAMES = ['rss', 'feed', 'news', 'links', 'リンク', 'ニュース', 'フィード', 'RSS'];
  private sendMessageCallback?: (channelId: string, platform: string, content: string) => Promise<void>;
  private timeseriesMemory: TimeseriesMemoryManager;

  constructor(chatAgent: ChatAgent, databasePath?: string) {
    this.chatAgent = chatAgent;
    
    // Initialize timeseries memory for RSS data
    const dbPath = databasePath?.replace('.db', '-timeseries.db') || './data/timeseries.db';
    this.timeseriesMemory = new TimeseriesMemoryManager(dbPath);
    
    logger.info('RSS Monitor initialized with timeseries memory');
  }

  /**
   * Set callback for sending messages to Discord
   */
  setSendMessageCallback(callback: (channelId: string, platform: string, content: string) => Promise<void>): void {
    this.sendMessageCallback = callback;
  }

  /**
   * Check if a channel is an RSS channel
   */
  isRSSChannel(channelName: string): boolean {
    const lowerName = channelName.toLowerCase();
    return this.RSS_CHANNEL_NAMES.some(name => lowerName.includes(name));
  }

  /**
   * Extract URLs from message content
   */
  extractUrls(content: string): string[] {
    // More comprehensive URL regex pattern - include forward slashes for paths
    const urlRegex = /https?:\/\/[^\s<>"'`]+/g;
    const urls = content.match(urlRegex) || [];
    
    // Clean URLs and validate
    return urls.map(url => {
      // Remove common trailing characters that shouldn't be part of URLs
      let cleanUrl = url.replace(/[`'")\]}*]+$/, '');
      
      // Additional cleanup for malformed URLs and markdown
      cleanUrl = cleanUrl.replace(/[`)]+$/, '');
      cleanUrl = cleanUrl.replace(/\*+$/, ''); // Remove trailing asterisks
      
      return cleanUrl;
    }).filter(url => {
      try {
        const urlObj = new URL(url);
        // Basic validation - should be http/https and have a valid domain
        return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') && 
               urlObj.hostname.includes('.');
      } catch {
        return false;
      }
    });
  }

  /**
   * Process new message in RSS channel
   */
  async processRSSMessage(
    content: string,
    userId: string,
    channelId: string,
    platform: string,
    timestamp: Date = new Date()
  ): Promise<void> {
    logger.info(`RSS processing message from ${userId} in ${channelId}: ${content.substring(0, 100)}...`);
    
    try {
      const urls = this.extractUrls(content);
      
      logger.info(`Extracted ${urls.length} URLs: ${urls.join(', ')}`);
      
      if (urls.length === 0) {
        logger.debug('No URLs found in message');
        return;
      }

      for (const url of urls) {
        if (this.processedLinks.has(url)) {
          logger.debug(`URL already processed: ${url}`);
          continue;
        }

        try {
          const linkInfo: LinkInfo = {
            url,
            domain: this.extractDomain(url),
            timestamp,
            postedBy: userId,
            channelId,
            platform,
          };

          logger.info(`Processing new URL: ${url} from domain: ${linkInfo.domain}`);
          
          // Fetch and analyze the link
          await this.analyzeLinkAndComment(linkInfo);
          
          this.processedLinks.add(url);
          this.linkHistory.push(linkInfo);
          
          // Keep only recent 100 links
          if (this.linkHistory.length > 100) {
            this.linkHistory.shift();
          }

          logger.info(`Successfully processed URL: ${url}`);

        } catch (error) {
          logger.error(`Error processing URL ${url}:`, error);
          // Continue processing other URLs even if one fails
        }
      }
    } catch (error) {
      logger.error(`Error processing RSS message:`, error);
    }
  }

  /**
   * Analyze link content and generate commentary
   */
  private async analyzeLinkAndComment(linkInfo: LinkInfo): Promise<void> {
    try {
      logger.info(`Analyzing link: ${linkInfo.url}`);

      // Fetch content using WebFetch tool
      const analysis = await this.analyzeLink(linkInfo);
      
      if (analysis) {
        // Generate and send commentary
        await this.sendCommentary(linkInfo, analysis);
      }

    } catch (error) {
      logger.error(`Error analyzing link ${linkInfo.url}:`, error);
    }
  }

  /**
   * Analyze link using AI with content fetching
   */
  private async analyzeLink(linkInfo: LinkInfo): Promise<LinkAnalysis | null> {
    try {
      logger.info(`Starting link analysis for: ${linkInfo.url}`);
      
      // Use WebFetch to get content first, then analyze
      const analysisPrompt = `このリンクの内容を分析して、以下の形式で日本語で回答してください：

## 📝 記事要約
[2-3文で内容をまとめる]

## 🎯 重要ポイント
1. [ポイント1]
2. [ポイント2]
3. [ポイント3]

## 📂 カテゴリ
[技術/AI/ビジネス/ニュース/研究/デザイン/その他]

## 📊 難易度
[初級/中級/上級]

## ⏱️ 読了時間
[推定時間]分

## 🏷️ 関連トピック
[カンマ区切りで関連するキーワード]

## 💡 AIAS解説
[親しみやすい日本語で、内容について詳しく解説。技術記事の場合は実装のポイントや背景技術も含める]

## 🤔 ディスカッション質問
• [質問1]
• [質問2]
• [質問3]`;

      // Use WebFetch tool through ChatAgent
      const analysisMessage = {
        role: 'user' as const,
        content: `webFetchツールを使って、以下のURLの内容を取得して分析してください：${linkInfo.url}

取得した内容を以下の形式で分析して回答してください：

## 📝 記事要約
[2-3文で内容をまとめる]

## 🎯 重要ポイント  
1. [重要なポイント1]
2. [重要なポイント2]
3. [重要なポイント3]

## 📂 カテゴリ
[技術/AI/Web開発/ビジネス/ニュース/研究/デザイン/その他]

## 📊 難易度
[初級/中級/上級]

## ⏱️ 読了時間  
[推定分数]分

## 🏷️ 関連トピック
[カンマ区切りでキーワード]

## 💡 AIAS解説
[親しみやすい日本語で詳しく解説。技術記事の場合は実装ポイントや背景技術も含める。なぜこの記事が重要で、どのような価値があるかを説明する]

## 🤔 ディスカッション質問
• [この記事に関する議論を促す質問1]
• [技術的な深堀りにつながる質問2]  
• [実践的な応用に関する質問3]

必ずwebFetchツールを使ってURLの実際の内容を取得してから分析してください。`,
        timestamp: new Date(),
        userId: 'rss-monitor',
        channelId: linkInfo.channelId,
        platform: linkInfo.platform,
      };

      logger.debug('Sending analysis request to ChatAgent');
      const response = await this.chatAgent.processMessage(analysisMessage);
      
      if (response.content) {
        logger.info('Analysis response received, parsing content');
        return this.parseAnalysisResponse(response.content);
      }

      logger.warn('No content received from analysis');
      return null;

    } catch (error) {
      logger.error('Error in AI analysis:', error);
      return null;
    }
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(content: string): LinkAnalysis {
    // Simple parsing - in a real implementation, you might want more sophisticated parsing
    const summary = this.extractSection(content, ['要約', 'サマリー']) || 'コンテンツの分析中...';
    const commentary = this.extractSection(content, ['コメント', '解説']) || content.substring(0, 300);
    
    return {
      summary,
      keyPoints: this.extractListItems(content, ['ポイント', '重要']),
      category: this.extractSection(content, ['カテゴリ']) || 'その他',
      difficulty: this.extractDifficulty(content),
      estimatedReadTime: this.extractReadTime(content),
      relevantTopics: this.extractListItems(content, ['トピック', '関連']),
      commentary,
      discussionPrompts: this.extractListItems(content, ['質問', 'ディスカッション']),
    };
  }

  /**
   * Extract section from text
   */
  private extractSection(text: string, keywords: string[]): string | null {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[：:](.*?)(?=\\n|$)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Extract list items from text
   */
  private extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[：:]([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        const lines = match[1].split('\n');
        for (const line of lines) {
          const item = line.trim().replace(/^[-•\d\.]\s*/, '');
          if (item) {
            items.push(item);
          }
        }
      }
    }
    return items.slice(0, 5); // Limit to 5 items
  }

  /**
   * Extract difficulty level
   */
  private extractDifficulty(text: string): 'beginner' | 'intermediate' | 'advanced' {
    const lower = text.toLowerCase();
    if (lower.includes('上級') || lower.includes('advanced')) return 'advanced';
    if (lower.includes('中級') || lower.includes('intermediate')) return 'intermediate';
    return 'beginner';
  }

  /**
   * Extract estimated read time
   */
  private extractReadTime(text: string): number {
    const match = text.match(/(\d+)\s*分/);
    return match ? parseInt(match[1]) : 5; // Default to 5 minutes
  }

  /**
   * Send commentary to the channel
   */
  private async sendCommentary(linkInfo: LinkInfo, analysis: LinkAnalysis): Promise<void> {
    try {
      // Format commentary message
      const commentary = this.formatCommentary(linkInfo, analysis);
      
      logger.info(`Preparing to send commentary for: ${linkInfo.url}`);
      logger.debug(`Commentary content: ${commentary.substring(0, 200)}...`);
      
      // Save to timeseries memory first
      await this.saveToTimeseriesMemory(linkInfo, analysis);
      
      // Send message using callback if available
      if (this.sendMessageCallback) {
        logger.info(`Sending commentary via callback for: ${linkInfo.url}`);
        await this.sendMessageCallback(linkInfo.channelId, linkInfo.platform, commentary);
        logger.info(`Successfully sent commentary via callback for: ${linkInfo.url}`);
      } else {
        logger.warn(`No sendMessageCallback available, falling back to conversation history for: ${linkInfo.url}`);
        
        // Fallback: Save to conversation history only
        const commentMessage = {
          role: 'assistant' as const,
          content: commentary,
          timestamp: new Date(),
          userId: 'aias',
          channelId: linkInfo.channelId,
          platform: linkInfo.platform,
        };

        await this.chatAgent.processMessage(commentMessage);
        logger.info(`Saved commentary to history for: ${linkInfo.url}`);
      }

    } catch (error) {
      logger.error('Error sending commentary:', error);
      throw error; // Re-throw to handle in calling function
    }
  }

  /**
   * Format commentary message
   */
  private formatCommentary(linkInfo: LinkInfo, analysis: LinkAnalysis): string {
    const domainEmoji = this.getDomainEmoji(linkInfo.domain);
    const difficultyEmoji = this.getDifficultyEmoji(analysis.difficulty);
    const categoryEmoji = this.getCategoryEmoji(analysis.category);

    let commentary = `${domainEmoji} **${linkInfo.domain}の記事を発見しました！**\n\n`;
    
    commentary += `${categoryEmoji} **カテゴリ**: ${analysis.category} ${difficultyEmoji}\n`;
    commentary += `⏱️ **読了時間**: 約${analysis.estimatedReadTime}分\n\n`;
    
    commentary += `📝 **要約**\n${analysis.summary}\n\n`;
    
    if (analysis.keyPoints.length > 0) {
      commentary += `🎯 **重要ポイント**\n`;
      analysis.keyPoints.forEach((point, index) => {
        commentary += `${index + 1}. ${point}\n`;
      });
      commentary += '\n';
    }
    
    commentary += `💡 **解説**\n${analysis.commentary}\n\n`;
    
    if (analysis.discussionPrompts.length > 0) {
      commentary += `🤔 **ディスカッションのきっかけに**\n`;
      analysis.discussionPrompts.forEach((prompt, index) => {
        commentary += `• ${prompt}\n`;
      });
      commentary += '\n';
    }
    
    if (analysis.relevantTopics.length > 0) {
      commentary += `🏷️ **関連トピック**: ${analysis.relevantTopics.join(', ')}\n`;
    }
    
    commentary += `\n📎 [元記事を読む](${linkInfo.url})`;
    
    return commentary;
  }

  /**
   * Get emoji for domain
   */
  private getDomainEmoji(domain: string): string {
    const emojiMap: Record<string, string> = {
      'github.com': '🐙',
      'qiita.com': '📘',
      'zenn.dev': '📚',
      'medium.com': '📖',
      'dev.to': '👨‍💻',
      'stackoverflow.com': '❓',
      'youtube.com': '🎥',
      'twitter.com': '🐦',
      'reddit.com': '🤖',
      'hackernews': '🍊',
    };
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (domain.includes(key)) {
        return emoji;
      }
    }
    return '🔗';
  }

  /**
   * Get emoji for difficulty
   */
  private getDifficultyEmoji(difficulty: string): string {
    const emojiMap = {
      'beginner': '🌱',
      'intermediate': '🌿',
      'advanced': '🌳',
    };
    return emojiMap[difficulty as keyof typeof emojiMap] || '📄';
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: string): string {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('技術') || categoryLower.includes('tech')) return '💻';
    if (categoryLower.includes('ai') || categoryLower.includes('機械学習')) return '🤖';
    if (categoryLower.includes('ビジネス') || categoryLower.includes('business')) return '💼';
    if (categoryLower.includes('ニュース') || categoryLower.includes('news')) return '📰';
    if (categoryLower.includes('研究') || categoryLower.includes('research')) return '🔬';
    if (categoryLower.includes('デザイン') || categoryLower.includes('design')) return '🎨';
    return '📄';
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get recent link history
   */
  getRecentLinks(limit: number = 10): LinkInfo[] {
    return this.linkHistory.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalProcessed: number;
    recentLinks: number;
    topDomains: { domain: string; count: number }[];
  } {
    const domainCounts = new Map<string, number>();
    
    for (const link of this.linkHistory) {
      const count = domainCounts.get(link.domain) || 0;
      domainCounts.set(link.domain, count + 1);
    }
    
    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalProcessed: this.processedLinks.size,
      recentLinks: this.linkHistory.length,
      topDomains,
    };
  }

  /**
   * Clear old processed links (cleanup)
   */
  cleanup(): void {
    // Keep only recent 500 processed links
    if (this.processedLinks.size > 500) {
      const linksArray = Array.from(this.processedLinks);
      this.processedLinks.clear();
      // Keep the most recent 250
      for (const link of linksArray.slice(-250)) {
        this.processedLinks.add(link);
      }
    }
  }

  /**
   * Test URL extraction (for debugging)
   */
  testUrlExtraction(content: string): string[] {
    const urls = this.extractUrls(content);
    logger.info(`Test URL extraction from: "${content}"`);
    logger.info(`Found URLs: ${urls.join(', ')}`);
    return urls;
  }

  /**
   * Test channel name recognition (for debugging)
   */
  testChannelRecognition(channelName: string): boolean {
    const isRSS = this.isRSSChannel(channelName);
    logger.info(`Test channel recognition for: "${channelName}" -> ${isRSS}`);
    return isRSS;
  }

  /**
   * Get current configuration status
   */
  getDebugInfo(): {
    processedLinksCount: number;
    linkHistoryCount: number;
    hasCallback: boolean;
    rssChannelNames: string[];
  } {
    return {
      processedLinksCount: this.processedLinks.size,
      linkHistoryCount: this.linkHistory.length,
      hasCallback: !!this.sendMessageCallback,
      rssChannelNames: this.RSS_CHANNEL_NAMES,
    };
  }

  /**
   * Save link and analysis to timeseries memory
   */
  private async saveToTimeseriesMemory(linkInfo: LinkInfo, analysis: LinkAnalysis): Promise<void> {
    try {
      // Extract tags from analysis
      const tags = [
        ...analysis.relevantTopics,
        analysis.category,
        analysis.difficulty,
        linkInfo.domain || 'unknown'
      ].filter(Boolean);

      // Calculate relevance score based on category and difficulty
      const relevanceScore = this.timeseriesMemory.calculateRelevanceScore({
        source: 'rss',
        category: 'article',
        title: linkInfo.title || 'RSS Link',
        content: analysis.summary,
        url: linkInfo.url,
        domain: linkInfo.domain,
        tags,
        metadata: {
          analysis,
          linkInfo,
          postedBy: linkInfo.postedBy
        },
        timestamp: linkInfo.timestamp,
        userId: linkInfo.postedBy,
        channelId: linkInfo.channelId,
        platform: linkInfo.platform
      }, ['技術', 'プログラミング', 'AI', 'Web開発']); // Default tech interests

      // Create timeseries entry
      const timeseriesEntry: TimeseriesEntry = {
        source: 'rss',
        category: 'article',
        title: linkInfo.title || 'RSS Link',
        content: analysis.summary,
        url: linkInfo.url,
        domain: linkInfo.domain,
        tags,
        metadata: {
          analysis,
          linkInfo,
          postedBy: linkInfo.postedBy,
          keyPoints: analysis.keyPoints,
          discussionPrompts: analysis.discussionPrompts,
          estimatedReadTime: analysis.estimatedReadTime
        },
        relevanceScore,
        timestamp: linkInfo.timestamp,
        userId: linkInfo.postedBy,
        channelId: linkInfo.channelId,
        platform: linkInfo.platform
      };

      const entryId = await this.timeseriesMemory.saveEntry(timeseriesEntry);
      logger.info(`Saved RSS entry to timeseries memory: ID ${entryId}, relevance: ${relevanceScore.toFixed(2)}`);
    } catch (error) {
      logger.error('Error saving to timeseries memory:', error);
    }
  }

  /**
   * Get trending topics from RSS data
   */
  async getTrendingTopics(period: 'hour' | 'day' | 'week' | 'month' = 'day', limit = 10): Promise<any[]> {
    try {
      return await this.timeseriesMemory.getTrendingTopics(period, limit);
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Get recent RSS entries
   */
  async getRecentRSSEntries(limit = 20): Promise<any[]> {
    try {
      return await this.timeseriesMemory.queryEntries({
        source: 'rss',
        category: 'article',
        limit
      });
    } catch (error) {
      logger.error('Error getting recent RSS entries:', error);
      return [];
    }
  }

  /**
   * Search RSS entries by topic
   */
  async searchRSSByTopic(topic: string, limit = 10): Promise<any[]> {
    try {
      return await this.timeseriesMemory.queryEntries({
        source: 'rss',
        tags: [topic],
        limit
      });
    } catch (error) {
      logger.error('Error searching RSS by topic:', error);
      return [];
    }
  }

  /**
   * Get RSS analytics
   */
  async getRSSAnalytics(): Promise<any> {
    try {
      const [stats, trendingToday, trendingWeek] = await Promise.all([
        this.timeseriesMemory.getStats(),
        this.timeseriesMemory.getTrendingTopics('day', 5),
        this.timeseriesMemory.getTrendingTopics('week', 10)
      ]);

      return {
        ...stats,
        trending: {
          today: trendingToday,
          thisWeek: trendingWeek
        }
      };
    } catch (error) {
      logger.error('Error getting RSS analytics:', error);
      return { totalEntries: 0, recentEntries: 0, trending: { today: [], thisWeek: [] } };
    }
  }

  /**
   * Close timeseries memory connection
   */
  closeTimeseriesMemory(): void {
    this.timeseriesMemory.close();
  }
}