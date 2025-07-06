/**
 * Trigger system for autonomous actions
 */

import { logger } from '../utils/logger.js';
import type { ChatMessage } from '../agents/chat-agent.js';

export interface TriggerCondition {
  type: 'message_pattern' | 'time_based' | 'user_activity' | 'platform_event';
  config: Record<string, unknown>;
}

export interface Trigger {
  id: string;
  name: string;
  description: string;
  conditions: TriggerCondition[];
  action: (context: TriggerContext) => Promise<void>;
  enabled: boolean;
  cooldown?: number; // in milliseconds
  lastTriggered?: Date;
}

export interface TriggerContext {
  type: 'message' | 'time' | 'platform_event';
  message?: ChatMessage;
  platform?: string;
  channelId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class TriggerSystem {
  private triggers: Map<string, Trigger> = new Map();

  /**
   * Add a trigger
   */
  addTrigger(trigger: Trigger): void {
    this.triggers.set(trigger.id, trigger);
    logger.info(`Trigger added: ${trigger.name} (${trigger.id})`);
  }

  /**
   * Remove a trigger
   */
  removeTrigger(triggerId: string): void {
    this.triggers.delete(triggerId);
    logger.info(`Trigger removed: ${triggerId}`);
  }

  /**
   * Enable or disable a trigger
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      logger.warn(`Trigger not found: ${triggerId}`);
      return;
    }

    trigger.enabled = enabled;
    logger.info(`Trigger ${triggerId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Process a message and check for triggers
   */
  async processMessage(message: ChatMessage): Promise<void> {
    const context: TriggerContext = {
      type: 'message',
      message,
      platform: message.platform,
      channelId: message.channelId,
      userId: message.userId,
      timestamp: message.timestamp,
    };

    await this.checkTriggers(context);
  }

  /**
   * Process a time-based event and check for triggers
   */
  async processTimeEvent(timestamp: Date): Promise<void> {
    const context: TriggerContext = {
      type: 'time',
      timestamp,
    };

    await this.checkTriggers(context);
  }

  /**
   * Process a platform event and check for triggers
   */
  async processPlatformEvent(
    platform: string,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const context: TriggerContext = {
      type: 'platform_event',
      platform,
      timestamp: new Date(),
      metadata: {
        eventType,
        ...data,
      },
    };

    await this.checkTriggers(context);
  }

  /**
   * Check all triggers against a context
   */
  private async checkTriggers(context: TriggerContext): Promise<void> {
    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) {
        continue;
      }

      // Check cooldown
      if (trigger.cooldown && trigger.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - trigger.lastTriggered.getTime();
        if (timeSinceLastTrigger < trigger.cooldown) {
          continue;
        }
      }

      // Check conditions
      const shouldTrigger = await this.evaluateConditions(trigger.conditions, context);
      
      if (shouldTrigger) {
        try {
          logger.info(`Trigger activated: ${trigger.name}`);
          
          trigger.lastTriggered = new Date();
          await trigger.action(context);
          
          logger.debug(`Trigger action completed: ${trigger.name}`);
        } catch (error) {
          logger.error(`Error executing trigger ${trigger.name}:`, error);
        }
      }
    }
  }

  /**
   * Evaluate trigger conditions
   */
  private async evaluateConditions(
    conditions: TriggerCondition[],
    context: TriggerContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) {
        return false; // All conditions must be true
      }
    }
    return conditions.length > 0; // At least one condition must exist
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    context: TriggerContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'message_pattern':
        return this.evaluateMessagePattern(condition, context);
      
      case 'time_based':
        return this.evaluateTimeBased(condition, context);
      
      case 'user_activity':
        return this.evaluateUserActivity(condition, context);
      
      case 'platform_event':
        return this.evaluatePlatformEvent(condition, context);
      
      default:
        logger.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Evaluate message pattern condition
   */
  private evaluateMessagePattern(
    condition: TriggerCondition,
    context: TriggerContext
  ): boolean {
    if (context.type !== 'message' || !context.message) {
      return false;
    }

    const { pattern, matchType = 'contains' } = condition.config;
    if (typeof pattern !== 'string') {
      return false;
    }

    const content = context.message.content.toLowerCase();
    const searchPattern = pattern.toLowerCase();

    switch (matchType) {
      case 'contains':
        return content.includes(searchPattern);
      
      case 'starts_with':
        return content.startsWith(searchPattern);
      
      case 'ends_with':
        return content.endsWith(searchPattern);
      
      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(content);
        } catch (error) {
          logger.warn(`Invalid regex pattern: ${pattern}`);
          return false;
        }
      
      default:
        return false;
    }
  }

  /**
   * Evaluate time-based condition
   */
  private evaluateTimeBased(
    condition: TriggerCondition,
    context: TriggerContext
  ): boolean {
    const { hour, minute, dayOfWeek } = condition.config;
    const now = context.timestamp;

    if (typeof hour === 'number' && now.getHours() !== hour) {
      return false;
    }

    if (typeof minute === 'number' && now.getMinutes() !== minute) {
      return false;
    }

    if (typeof dayOfWeek === 'number' && now.getDay() !== dayOfWeek) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate user activity condition
   */
  private evaluateUserActivity(
    condition: TriggerCondition,
    context: TriggerContext
  ): boolean {
    // TODO: Implement user activity evaluation
    // This could include things like:
    // - User hasn't been active for X minutes
    // - New user joined
    // - User sent first message
    return false;
  }

  /**
   * Evaluate platform event condition
   */
  private evaluatePlatformEvent(
    condition: TriggerCondition,
    context: TriggerContext
  ): boolean {
    if (context.type !== 'platform_event') {
      return false;
    }

    const { eventType, platform } = condition.config;
    
    if (typeof eventType === 'string' && context.metadata?.['eventType'] !== eventType) {
      return false;
    }

    if (typeof platform === 'string' && context.platform !== platform) {
      return false;
    }

    return true;
  }

  /**
   * Get trigger system status
   */
  getStatus(): {
    triggersCount: number;
    activeTriggers: number;
    triggers: Array<{
      id: string;
      name: string;
      enabled: boolean;
      lastTriggered?: string;
      conditionsCount: number;
    }>;
  } {
    const triggers = Array.from(this.triggers.values()).map(trigger => ({
      id: trigger.id,
      name: trigger.name,
      enabled: trigger.enabled,
      ...(trigger.lastTriggered && { lastTriggered: trigger.lastTriggered.toISOString() }),
      conditionsCount: trigger.conditions.length,
    }));

    return {
      triggersCount: this.triggers.size,
      activeTriggers: triggers.filter(t => t.enabled).length,
      triggers,
    };
  }
}