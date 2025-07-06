/**
 * Action system for autonomous behaviors
 */

import { logger } from '../utils/logger.js';
import type { ChatAgent, ChatMessage } from '../agents/chat-agent.js';

export interface ActionContext {
  platform: string;
  channelId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Action {
  id: string;
  name: string;
  description: string;
  type: 'message' | 'reaction' | 'analysis' | 'custom';
  execute: (context: ActionContext) => Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export class ActionSystem {
  private actions: Map<string, Action> = new Map();
  private chatAgent: ChatAgent;

  constructor(chatAgent: ChatAgent) {
    this.chatAgent = chatAgent;
    this.initializeDefaultActions();
  }

  /**
   * Register an action
   */
  registerAction(action: Action): void {
    this.actions.set(action.id, action);
    logger.info(`Action registered: ${action.name} (${action.id})`);
  }

  /**
   * Execute an action
   */
  async executeAction(actionId: string, context: ActionContext): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      const error = `Action not found: ${actionId}`;
      logger.error(error);
      return { success: false, error };
    }

    try {
      logger.debug(`Executing action: ${action.name}`);
      const result = await action.execute(context);
      
      if (result.success) {
        logger.info(`Action completed successfully: ${action.name}`);
      } else {
        logger.warn(`Action failed: ${action.name} - ${result.error}`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = `Error executing action ${action.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get available actions
   */
  getActions(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Initialize default actions
   */
  private initializeDefaultActions(): void {
    // Send a proactive message
    this.registerAction({
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to a channel',
      type: 'message',
      execute: async (context: ActionContext): Promise<ActionResult> => {
        const { platform, channelId, metadata } = context;
        const messageContent = metadata?.['message'] as string;
        
        if (!messageContent) {
          return { success: false, error: 'No message content provided' };
        }

        // Create a synthetic message for the chat agent
        const syntheticMessage: ChatMessage = {
          role: 'user',
          content: `Generate a proactive message for this context: ${messageContent}`,
          timestamp: new Date(),
          userId: 'system',
          channelId,
          platform: platform as ChatMessage['platform'],
        };

        try {
          const response = await this.chatAgent.processMessage(syntheticMessage);
          
          return {
            success: true,
            message: response.content,
            data: {
              type: 'proactive_message',
              content: response.content,
              metadata: response.metadata,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to generate message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Analyze conversation patterns
    this.registerAction({
      id: 'analyze_conversation',
      name: 'Analyze Conversation',
      description: 'Analyze recent conversation patterns and provide insights',
      type: 'analysis',
      execute: async (context: ActionContext): Promise<ActionResult> => {
        const { platform, channelId } = context;
        
        try {
          // Get recent conversation history
          const history = await this.chatAgent.getConversationHistory(platform, channelId, 20);
          
          if (history.length === 0) {
            return {
              success: true,
              message: 'No conversation history available for analysis',
              data: { messageCount: 0 },
            };
          }

          // Simple analysis
          const userMessages = history.filter(msg => msg.role === 'user');
          const assistantMessages = history.filter(msg => msg.role === 'assistant');
          const uniqueUsers = new Set(userMessages.map(msg => msg.userId)).size;
          
          const analysis = {
            totalMessages: history.length,
            userMessages: userMessages.length,
            assistantMessages: assistantMessages.length,
            uniqueUsers,
            timespan: history.length > 0 ? {
              start: history[0]?.timestamp.toISOString(),
              end: history[history.length - 1]?.timestamp.toISOString(),
            } : null,
          };

          return {
            success: true,
            message: `Analyzed ${analysis.totalMessages} messages from ${analysis.uniqueUsers} users`,
            data: analysis,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to analyze conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Check for inactive channels
    this.registerAction({
      id: 'check_activity',
      name: 'Check Activity',
      description: 'Check if a channel has been inactive and potentially re-engage',
      type: 'analysis',
      execute: async (context: ActionContext): Promise<ActionResult> => {
        const { platform, channelId } = context;
        const inactivityThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        try {
          const history = await this.chatAgent.getConversationHistory(platform, channelId, 5);
          
          if (history.length === 0) {
            return {
              success: true,
              message: 'No conversation history found',
              data: { status: 'no_history' },
            };
          }

          const lastMessage = history[history.length - 1];
          if (!lastMessage) {
            return {
              success: true,
              message: 'No recent messages found',
              data: { status: 'no_recent_messages' },
            };
          }

          const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
          const isInactive = timeSinceLastMessage > inactivityThreshold;

          return {
            success: true,
            message: isInactive ? 'Channel is inactive' : 'Channel is active',
            data: {
              status: isInactive ? 'inactive' : 'active',
              lastMessageTime: lastMessage.timestamp.toISOString(),
              timeSinceLastMessage,
              threshold: inactivityThreshold,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to check activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Generate contextual response
    this.registerAction({
      id: 'contextual_response',
      name: 'Contextual Response',
      description: 'Generate a contextual response based on conversation history',
      type: 'message',
      execute: async (context: ActionContext): Promise<ActionResult> => {
        const { platform, channelId, metadata } = context;
        const prompt = metadata?.['prompt'] as string || 'Generate a helpful and engaging message based on our conversation history.';
        
        try {
          // Create a synthetic message for generating contextual response
          const syntheticMessage: ChatMessage = {
            role: 'user',
            content: prompt,
            timestamp: new Date(),
            userId: 'system',
            channelId,
            platform: platform as ChatMessage['platform'],
          };

          const response = await this.chatAgent.processMessage(syntheticMessage);
          
          return {
            success: true,
            message: response.content,
            data: {
              type: 'contextual_response',
              content: response.content,
              prompt,
              metadata: response.metadata,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to generate contextual response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    logger.info('Default actions initialized');
  }
}