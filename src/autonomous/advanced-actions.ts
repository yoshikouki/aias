/**
 * Advanced autonomous actions for proactive behavior
 */

import type { ChatAgent } from '../agents/chat-agent.js';
import type { ActionContext } from './actions.js';
import { logger } from '../utils/logger.js';

export interface ChannelActivity {
  channelId: string;
  platform: string;
  lastMessageTime: Date;
  messageCount: number;
  uniqueUsers: Set<string>;
  topics: string[];
}

export interface ActivitySummary {
  totalMessages: number;
  activeChannels: number;
  activeUsers: number;
  mostActiveChannel: string;
  quietChannels: string[];
  trends: string[];
}

export class AdvancedAutonomousActions {
  private chatAgent: ChatAgent;
  private channelActivities: Map<string, ChannelActivity> = new Map();
  private lastSummaryTime: Date = new Date();

  constructor(chatAgent: ChatAgent) {
    this.chatAgent = chatAgent;
  }

  /**
   * Track message activity for a channel
   */
  trackActivity(
    channelId: string,
    platform: string,
    userId: string,
    content: string,
    timestamp: Date = new Date()
  ): void {
    const key = `${platform}:${channelId}`;
    
    let activity = this.channelActivities.get(key);
    if (!activity) {
      activity = {
        channelId,
        platform,
        lastMessageTime: timestamp,
        messageCount: 0,
        uniqueUsers: new Set(),
        topics: [],
      };
      this.channelActivities.set(key, activity);
    }

    activity.lastMessageTime = timestamp;
    activity.messageCount++;
    activity.uniqueUsers.add(userId);

    // Extract topics from content (simple keyword extraction)
    const topics = this.extractTopics(content);
    activity.topics = [...new Set([...activity.topics, ...topics])].slice(-10);
  }

  /**
   * Check for inactive channels and potentially activate them
   */
  async checkInactiveChannels(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 2 * 60 * 60 * 1000; // 2 hours

    for (const [key, activity] of this.channelActivities) {
      const timeSinceLastMessage = now.getTime() - activity.lastMessageTime.getTime();
      
      if (timeSinceLastMessage > inactiveThreshold && activity.messageCount > 5) {
        logger.info(`Channel ${key} has been inactive for ${Math.round(timeSinceLastMessage / (60 * 1000))} minutes`);
        
        await this.activateChannel(activity);
      }
    }
  }

  /**
   * Activate a quiet channel with engaging content
   */
  private async activateChannel(activity: ChannelActivity): Promise<void> {
    try {
      const activationStrategies = [
        () => this.shareInterestingFact(activity),
        () => this.askEngagingQuestion(activity),
        () => this.summarizePreviousDiscussion(activity),
        () => this.suggestActivity(activity),
      ];

      // Choose random strategy
      const strategy = activationStrategies[Math.floor(Math.random() * activationStrategies.length)];
      if (strategy) {
        await strategy();
      }
    } catch (error) {
      logger.error('Error activating channel:', error);
    }
  }

  /**
   * Share an interesting fact or tip
   */
  private async shareInterestingFact(activity: ChannelActivity): Promise<void> {
    const facts = [
      '💡 豆知識: プログラミングでよく使われる「Hello, World!」は、1972年にブライアン・カーニハンが初めて使ったと言われています！',
      '🔍 ちょっとした発見: SQLiteのデータベースファイルは、単純なファイルなので簡単にバックアップできます。便利ですね！',
      '⚡ パフォーマンスのコツ: JavaScriptの配列で要素を探すとき、findよりもincludesの方が高速なことが多いです！',
      '🎯 開発のコツ: コミットメッセージは「何をしたか」より「なぜしたか」を書く方が後で見返した時に理解しやすくなります。',
      '🚀 面白い話: 最初のWebサイトは1991年にティム・バーナーズ＝リーが作成し、今でも閲覧することができます！',
    ];

    const fact = facts[Math.floor(Math.random() * facts.length)];
    if (fact) {
      // This would be implemented by the platform-specific action system
      logger.info(`Would share fact in ${activity.platform}:${activity.channelId}: ${fact}`);
    }
  }

  /**
   * Ask an engaging question based on recent activity
   */
  private async askEngagingQuestion(activity: ChannelActivity): Promise<void> {
    const questions = [
      '🤔 みなさん最近どんなプロジェクトに取り組んでいますか？面白い話があれば聞かせてください！',
      '💭 今週学んだことで一番印象に残っていることはありますか？',
      '🎮 最近使っている便利なツールやライブラリがあれば教えてください！',
      '☕ 今日はいかがですか？何か困っていることがあれば相談してくださいね！',
      '📚 最近読んだ技術記事で面白いものはありますか？おすすめがあれば教えてください！',
    ];

    // Use topics to create more contextual questions
    if (activity.topics.length > 0) {
      const recentTopic = activity.topics[activity.topics.length - 1];
      questions.push(`💡 先ほど${recentTopic}の話をされていましたが、もう少し詳しく聞かせていただけませんか？`);
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    if (question) {
      logger.info(`Would ask question in ${activity.platform}:${activity.channelId}: ${question}`);
    }
  }

  /**
   * Summarize previous discussion
   */
  private async summarizePreviousDiscussion(activity: ChannelActivity): Promise<void> {
    try {
      const history = await this.chatAgent.getConversationHistory(
        activity.platform,
        activity.channelId,
        10
      );

      if (history.length < 3) return;

      const recentTopics = activity.topics.slice(-3);
      if (recentTopics.length > 0) {
        const summary = `📝 これまでの話をまとめると、${recentTopics.join('、')}について話していましたね。他にも何かご質問やご意見はありますか？`;
        logger.info(`Would summarize in ${activity.platform}:${activity.channelId}: ${summary}`);
      }
    } catch (error) {
      logger.error('Error summarizing discussion:', error);
    }
  }

  /**
   * Suggest an activity or topic
   */
  private async suggestActivity(activity: ChannelActivity): Promise<void> {
    const suggestions = [
      '🎯 今日はコードレビューの時間にしてみませんか？お互いのコードを見せ合って学び合いましょう！',
      '🔧 最近みなさんが困っていることをシェアして、一緒に解決策を考えてみませんか？',
      '📖 今度勉強会やLT大会のようなイベントを開催してみるのも楽しそうですね！',
      '💻 みなさんの開発環境のセットアップについて聞いてみたいです！おすすめの設定はありますか？',
      '🎉 プロジェクトの進捗共有会のようなものを開催してみるのはいかがでしょうか？',
    ];

    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    if (suggestion) {
      logger.info(`Would suggest activity in ${activity.platform}:${activity.channelId}: ${suggestion}`);
    }
  }

  /**
   * Generate daily activity summary
   */
  async generateDailySummary(): Promise<ActivitySummary> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let totalMessages = 0;
    let activeChannels = 0;
    const allUsers = new Set<string>();
    const quietChannels: string[] = [];
    let mostActiveChannel = '';
    let maxMessages = 0;

    for (const [key, activity] of this.channelActivities) {
      if (activity.lastMessageTime > oneDayAgo) {
        activeChannels++;
        totalMessages += activity.messageCount;
        activity.uniqueUsers.forEach(user => allUsers.add(user));

        if (activity.messageCount > maxMessages) {
          maxMessages = activity.messageCount;
          mostActiveChannel = key;
        }
      } else {
        quietChannels.push(key);
      }
    }

    const trends = this.analyzeTrends();

    return {
      totalMessages,
      activeChannels,
      activeUsers: allUsers.size,
      mostActiveChannel,
      quietChannels,
      trends,
    };
  }

  /**
   * Analyze conversation trends
   */
  private analyzeTrends(): string[] {
    const topicFrequency = new Map<string, number>();
    
    for (const activity of this.channelActivities.values()) {
      for (const topic of activity.topics) {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      }
    }

    // Sort topics by frequency and get top 5
    const sortedTopics = Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    return sortedTopics;
  }

  /**
   * Extract topics from message content
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Programming languages
    const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'];
    for (const lang of languages) {
      if (lowerContent.includes(lang)) {
        topics.push(lang);
      }
    }

    // Technologies
    const techs = ['react', 'vue', 'angular', 'node', 'docker', 'kubernetes', 'aws', 'git', 'sql', 'mongodb'];
    for (const tech of techs) {
      if (lowerContent.includes(tech)) {
        topics.push(tech);
      }
    }

    // Japanese topics
    const japaneseTopics = ['プログラミング', '開発', 'プロジェクト', 'エラー', 'バグ', 'テスト', 'デプロイ', 'レビュー'];
    for (const topic of japaneseTopics) {
      if (content.includes(topic)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Get channel activity stats
   */
  getChannelStats(channelId: string, platform: string): ChannelActivity | null {
    const key = `${platform}:${channelId}`;
    return this.channelActivities.get(key) || null;
  }

  /**
   * Reset activity tracking (useful for testing)
   */
  resetActivityTracking(): void {
    this.channelActivities.clear();
    this.lastSummaryTime = new Date();
  }
}