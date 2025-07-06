/**
 * Autonomous behavior system
 * Coordinates scheduling, triggers, and actions for proactive behavior
 */

import { logger } from '../utils/logger.js';
import type { ChatAgent, ChatMessage } from '../agents/chat-agent.js';
import { AutonomousScheduler, type ScheduledTask } from './scheduler.js';
import { TriggerSystem, type Trigger, type TriggerContext } from './triggers.js';
import { ActionSystem, type ActionContext } from './actions.js';
import { AdvancedAutonomousActions, type ActivitySummary } from './advanced-actions.js';
import { RSSMonitor } from './rss-monitor.js';

export interface AutonomousConfig {
  enabled: boolean;
  schedulerEnabled: boolean;
  triggersEnabled: boolean;
  defaultTasks: boolean;
  defaultTriggers: boolean;
  advancedActionsEnabled: boolean;
  rssMonitoringEnabled: boolean;
}

export class AutonomousSystem {
  private scheduler: AutonomousScheduler;
  private triggerSystem: TriggerSystem;
  private actionSystem: ActionSystem;
  private advancedActions: AdvancedAutonomousActions;
  private rssMonitor: RSSMonitor;
  private chatAgent: ChatAgent;
  private config: AutonomousConfig;
  private isInitialized = false;

  constructor(chatAgent: ChatAgent, config: AutonomousConfig, databasePath?: string) {
    this.chatAgent = chatAgent;
    this.config = config;
    
    this.scheduler = new AutonomousScheduler();
    this.triggerSystem = new TriggerSystem();
    this.actionSystem = new ActionSystem(chatAgent);
    this.advancedActions = new AdvancedAutonomousActions(chatAgent);
    this.rssMonitor = new RSSMonitor(chatAgent, databasePath);
  }

  /**
   * Initialize the autonomous system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Autonomous system already initialized');
      return;
    }

    logger.info('Initializing autonomous system...');

    if (this.config.defaultTasks) {
      this.addDefaultScheduledTasks();
    }

    if (this.config.defaultTriggers) {
      this.addDefaultTriggers();
    }

    this.isInitialized = true;
    logger.info('Autonomous system initialized');
  }

  /**
   * Start the autonomous system
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('Autonomous system not initialized');
    }

    if (!this.config.enabled) {
      logger.info('Autonomous system is disabled');
      return;
    }

    logger.info('Starting autonomous system...');

    if (this.config.schedulerEnabled) {
      this.scheduler.start();
    }

    logger.info('Autonomous system started');
  }

  /**
   * Stop the autonomous system
   */
  stop(): void {
    logger.info('Stopping autonomous system...');
    
    this.scheduler.stop();
    
    logger.info('Autonomous system stopped');
  }

  /**
   * Process a message through the trigger system and track activity
   */
  async processMessage(message: ChatMessage, channelName?: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Track activity for advanced actions
      if (this.config.advancedActionsEnabled && message.role === 'user') {
        this.advancedActions.trackActivity(
          message.channelId,
          message.platform,
          message.userId,
          message.content,
          message.timestamp
        );
      }

      // Process RSS channel monitoring
      if (this.config.rssMonitoringEnabled && message.role === 'user' && channelName) {
        logger.info(`[RSS_CHECK] enabled=${this.config.rssMonitoringEnabled}, channel=${channelName}, role=${message.role}`);
        if (this.rssMonitor.isRSSChannel(channelName)) {
          logger.info(`RSS channel detected: ${channelName}, processing message: ${message.content.substring(0, 100)}`);
          await this.rssMonitor.processRSSMessage(
            message.content,
            message.userId,
            message.channelId,
            message.platform,
            message.timestamp
          );
        } else {
          logger.debug(`Channel ${channelName} is not an RSS channel`);
        }
      }

      // Process through trigger system
      if (this.config.triggersEnabled) {
        await this.triggerSystem.processMessage(message);
      }
    } catch (error) {
      logger.error('Error processing message in autonomous system:', error);
    }
  }

  /**
   * Add a scheduled task
   */
  addScheduledTask(task: ScheduledTask): void {
    this.scheduler.addTask(task);
  }

  /**
   * Add a trigger
   */
  addTrigger(trigger: Trigger): void {
    this.triggerSystem.addTrigger(trigger);
  }

  /**
   * Get system status
   */
  getStatus(): {
    enabled: boolean;
    initialized: boolean;
    scheduler: ReturnType<AutonomousScheduler['getStatus']>;
    triggers: ReturnType<TriggerSystem['getStatus']>;
    actions: {
      availableActions: number;
      actionNames: string[];
    };
    advancedActions: {
      enabled: boolean;
      trackedChannels: number;
    };
    rssMonitoring: {
      enabled: boolean;
      processedLinks: number;
      recentLinks: number;
      topDomains: { domain: string; count: number }[];
    };
  } {
    const actions = this.actionSystem.getActions();
    const rssStats = this.config.rssMonitoringEnabled ? this.rssMonitor.getStats() : null;
    
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      scheduler: this.scheduler.getStatus(),
      triggers: this.triggerSystem.getStatus(),
      actions: {
        availableActions: actions.length,
        actionNames: actions.map(a => a.name),
      },
      advancedActions: {
        enabled: this.config.advancedActionsEnabled,
        trackedChannels: this.advancedActions ? Object.keys(this.advancedActions).length : 0,
      },
      rssMonitoring: {
        enabled: this.config.rssMonitoringEnabled,
        processedLinks: rssStats?.totalProcessed || 0,
        recentLinks: rssStats?.recentLinks || 0,
        topDomains: rssStats?.topDomains || [],
      },
    };
  }

  /**
   * Add default scheduled tasks
   */
  private addDefaultScheduledTasks(): void {
    // Daily activity check and summary
    this.scheduler.addTask({
      id: 'daily_activity_check',
      name: 'Daily Activity Check',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      enabled: true,
      action: async () => {
        logger.info('Running daily activity check...');
        if (this.config.advancedActionsEnabled) {
          const summary = await this.advancedActions.generateDailySummary();
          logger.info('Daily activity summary:', summary);
          
          // Perform database maintenance
          await this.chatAgent.performMaintenance();
        }
      },
    });

    // Channel activation check (every 2 hours)
    this.scheduler.addTask({
      id: 'channel_activation_check',
      name: 'Channel Activation Check',
      interval: 2 * 60 * 60 * 1000, // 2 hours
      enabled: this.config.advancedActionsEnabled,
      action: async () => {
        logger.info('Checking for inactive channels...');
        if (this.config.advancedActionsEnabled) {
          await this.advancedActions.checkInactiveChannels();
        }
      },
    });

    // Hourly health check
    this.scheduler.addTask({
      id: 'health_check',
      name: 'System Health Check',
      interval: 60 * 60 * 1000, // 1 hour
      enabled: true,
      action: async () => {
        logger.debug('Running system health check...');
        const status = this.getStatus();
        const dbStats = this.chatAgent.getDatabaseStats();
        logger.debug('System status:', { ...status, database: dbStats });
      },
    });

    // Memory optimization (every 6 hours)
    this.scheduler.addTask({
      id: 'memory_optimization',
      name: 'Memory Optimization',
      interval: 6 * 60 * 60 * 1000, // 6 hours
      enabled: true,
      action: async () => {
        logger.info('Running memory optimization...');
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          logger.debug('Manual garbage collection performed');
        }
        
        // Clean up RSS monitor
        if (this.config.rssMonitoringEnabled) {
          this.rssMonitor.cleanup();
        }
      },
    });

    // RSS monitoring cleanup (every hour)
    this.scheduler.addTask({
      id: 'rss_monitoring_cleanup',
      name: 'RSS Monitoring Cleanup',
      interval: 60 * 60 * 1000, // 1 hour
      enabled: this.config.rssMonitoringEnabled,
      action: async () => {
        logger.debug('Running RSS monitoring cleanup...');
        if (this.config.rssMonitoringEnabled) {
          this.rssMonitor.cleanup();
          const stats = this.rssMonitor.getStats();
          logger.debug('RSS Monitor stats:', stats);
        }
      },
    });

    logger.info('Default scheduled tasks added');
  }

  /**
   * Add default triggers
   */
  private addDefaultTriggers(): void {
    // Greeting trigger
    this.triggerSystem.addTrigger({
      id: 'greeting_trigger',
      name: 'Greeting Response',
      description: 'Respond to greetings proactively',
      conditions: [
        {
          type: 'message_pattern',
          config: {
            pattern: 'hello|hi|hey|good morning|good afternoon|good evening',
            matchType: 'regex',
          },
        },
      ],
      enabled: true,
      cooldown: 5 * 60 * 1000, // 5 minutes
      action: async (context: TriggerContext) => {
        if (context.message && context.platform && context.channelId) {
          const actionContext: ActionContext = {
            platform: context.platform,
            channelId: context.channelId,
            userId: context.userId || 'unknown',
            timestamp: context.timestamp,
            metadata: {
              message: 'Respond warmly to the greeting and ask how I can help.',
            },
          };

          await this.actionSystem.executeAction('contextual_response', actionContext);
        }
      },
    });

    // Help request trigger
    this.triggerSystem.addTrigger({
      id: 'help_request_trigger',
      name: 'Help Request Response',
      description: 'Respond to help requests',
      conditions: [
        {
          type: 'message_pattern',
          config: {
            pattern: 'help|assistance|support|how to|can you',
            matchType: 'regex',
          },
        },
      ],
      enabled: true,
      cooldown: 2 * 60 * 1000, // 2 minutes
      action: async (context: TriggerContext) => {
        if (context.message && context.platform && context.channelId) {
          const actionContext: ActionContext = {
            platform: context.platform,
            channelId: context.channelId,
            userId: context.userId || 'unknown',
            timestamp: context.timestamp,
            metadata: {
              message: 'Provide helpful assistance based on what the user is asking about.',
            },
          };

          await this.actionSystem.executeAction('contextual_response', actionContext);
        }
      },
    });

    // Time-based proactive message
    this.triggerSystem.addTrigger({
      id: 'daily_checkin',
      name: 'Daily Check-in',
      description: 'Send a daily check-in message',
      conditions: [
        {
          type: 'time_based',
          config: {
            hour: 9, // 9 AM
            minute: 0,
          },
        },
      ],
      enabled: false, // Disabled by default, can be enabled per channel
      cooldown: 24 * 60 * 60 * 1000, // 24 hours
      action: async (context: TriggerContext) => {
        // This would need to be configured per channel
        logger.info('Daily check-in trigger activated');
      },
    });

    // Conversational trigger for general engagement
    this.triggerSystem.addTrigger({
      id: 'conversational_trigger',
      name: 'Conversational Engagement',
      description: 'Engage in natural conversation when appropriate',
      conditions: [
        {
          type: 'message_pattern',
          config: {
            pattern: '今日|今|なに|何|どう|どんな|面白い|楽しい|つまらない|疲れた|忙しい|暇|元気|調子|気分',
            matchType: 'regex',
          },
        },
      ],
      enabled: true,
      cooldown: 3 * 60 * 1000, // 3 minutes
      action: async (context: TriggerContext) => {
        if (context.message && context.platform && context.channelId) {
          const actionContext: ActionContext = {
            platform: context.platform,
            channelId: context.channelId,
            userId: context.userId || 'unknown',
            timestamp: context.timestamp,
            metadata: {
              message: 'Engage naturally in the conversation, showing interest and asking follow-up questions.',
            },
          };

          await this.actionSystem.executeAction('contextual_response', actionContext);
        }
      },
    });

    // Question trigger for when someone asks something
    this.triggerSystem.addTrigger({
      id: 'question_trigger',
      name: 'Question Response',
      description: 'Respond to questions naturally',
      conditions: [
        {
          type: 'message_pattern',
          config: {
            pattern: '\\?|？|教えて|知ってる|わかる|どこ|いつ|だれ|誰|なぜ|なんで|どうして',
            matchType: 'regex',
          },
        },
      ],
      enabled: true,
      cooldown: 1 * 60 * 1000, // 1 minute
      action: async (context: TriggerContext) => {
        if (context.message && context.platform && context.channelId) {
          const actionContext: ActionContext = {
            platform: context.platform,
            channelId: context.channelId,
            userId: context.userId || 'unknown',
            timestamp: context.timestamp,
            metadata: {
              message: 'Answer the question helpfully and conversationally.',
            },
          };

          await this.actionSystem.executeAction('contextual_response', actionContext);
        }
      },
    });

    logger.info('Default triggers added');
  }

  /**
   * Get activity summary for advanced actions
   */
  async getActivitySummary(): Promise<ActivitySummary | null> {
    if (!this.config.advancedActionsEnabled) {
      return null;
    }
    return this.advancedActions.generateDailySummary();
  }

  /**
   * Get channel activity stats
   */
  getChannelStats(channelId: string, platform: string) {
    if (!this.config.advancedActionsEnabled) {
      return null;
    }
    return this.advancedActions.getChannelStats(channelId, platform);
  }

  /**
   * Manually trigger channel activation check
   */
  async triggerChannelActivationCheck(): Promise<void> {
    if (!this.config.advancedActionsEnabled) {
      logger.warn('Advanced actions are disabled');
      return;
    }
    await this.advancedActions.checkInactiveChannels();
  }

  /**
   * Reset activity tracking (useful for testing)
   */
  resetActivityTracking(): void {
    if (this.config.advancedActionsEnabled) {
      this.advancedActions.resetActivityTracking();
    }
  }

  /**
   * Get RSS monitoring statistics
   */
  getRSSStats() {
    if (!this.config.rssMonitoringEnabled) {
      return null;
    }
    return this.rssMonitor.getStats();
  }

  /**
   * Get recent RSS links
   */
  getRecentRSSLinks(limit: number = 10) {
    if (!this.config.rssMonitoringEnabled) {
      return [];
    }
    return this.rssMonitor.getRecentLinks(limit);
  }

  /**
   * Manually process RSS message (for testing)
   */
  async processRSSMessage(
    content: string,
    userId: string,
    channelId: string,
    platform: string
  ): Promise<void> {
    if (!this.config.rssMonitoringEnabled) {
      logger.warn('RSS monitoring is disabled');
      return;
    }
    await this.rssMonitor.processRSSMessage(content, userId, channelId, platform);
  }

  /**
   * Set RSS message sending callback
   */
  setRSSMessageCallback(callback: (channelId: string, platform: string, content: string) => Promise<void>): void {
    if (this.config.rssMonitoringEnabled) {
      this.rssMonitor.setSendMessageCallback(callback);
    }
  }
}