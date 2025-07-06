/**
 * Base interface for all platform implementations
 */

import type { ChatAgent, ChatMessage } from '../../agents/chat-agent.js';
import type { AutonomousSystem } from '../../autonomous/index.js';

export type PlatformType = 'discord' | 'line' | 'slack' | 'github';

export interface PlatformConfig {
  enabled: boolean;
  credentials: Record<string, string>;
  features?: {
    messaging?: boolean;
    reactions?: boolean;
    files?: boolean;
    commands?: boolean;
    webhooks?: boolean;
  };
}

export interface PlatformMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    isBot: boolean;
  };
  channel: {
    id: string;
    name?: string;
    type: 'text' | 'dm' | 'voice' | 'thread' | 'group';
  };
  timestamp: Date;
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    contentType: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface PlatformResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformStatus {
  connected: boolean;
  authenticated: boolean;
  lastActivity?: Date;
  serverCount?: number;
  channelCount?: number;
  userCount?: number;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
  metadata?: Record<string, unknown>;
}

export interface PlatformCapabilities {
  messaging: {
    canSend: boolean;
    canReceive: boolean;
    canEdit: boolean;
    canDelete: boolean;
    maxLength: number;
    supportsMarkdown: boolean;
    supportsEmbeds: boolean;
    supportsThreads: boolean;
  };
  reactions: {
    canAdd: boolean;
    canRemove: boolean;
    customEmojis: boolean;
  };
  files: {
    canUpload: boolean;
    canDownload: boolean;
    maxSize: number;
    supportedTypes: string[];
  };
  commands: {
    supportsSlashCommands: boolean;
    supportsPrefixCommands: boolean;
    customCommands: boolean;
  };
  events: {
    supportedEvents: string[];
    webhookSupport: boolean;
  };
}

export abstract class BasePlatform {
  protected chatAgent: ChatAgent;
  protected autonomousSystem: AutonomousSystem | null = null;
  protected config: PlatformConfig;
  protected platformType: PlatformType;

  constructor(
    platformType: PlatformType,
    config: PlatformConfig,
    chatAgent: ChatAgent
  ) {
    this.platformType = platformType;
    this.config = config;
    this.chatAgent = chatAgent;
  }

  /**
   * Get platform type
   */
  getType(): PlatformType {
    return this.platformType;
  }

  /**
   * Get platform configuration
   */
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  /**
   * Set autonomous system
   */
  setAutonomousSystem(autonomousSystem: AutonomousSystem): void {
    this.autonomousSystem = autonomousSystem;
  }

  /**
   * Get platform capabilities
   */
  abstract getCapabilities(): PlatformCapabilities;

  /**
   * Initialize the platform
   */
  abstract initialize(): Promise<void>;

  /**
   * Start the platform connection
   */
  abstract start(): Promise<void>;

  /**
   * Stop the platform connection
   */
  abstract stop(): Promise<void>;

  /**
   * Send a message to a channel
   */
  abstract sendMessage(
    channelId: string,
    content: string,
    options?: {
      replyTo?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<PlatformResponse>;

  /**
   * Send a reaction to a message
   */
  abstract addReaction?(
    channelId: string,
    messageId: string,
    reaction: string
  ): Promise<PlatformResponse>;

  /**
   * Upload a file
   */
  abstract uploadFile?(
    channelId: string,
    file: {
      name: string;
      data: Buffer;
      contentType: string;
    },
    options?: {
      caption?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<PlatformResponse>;

  /**
   * Get platform status
   */
  abstract getStatus(): PlatformStatus;

  /**
   * Handle incoming platform message
   */
  protected async handleIncomingMessage(
    platformMessage: PlatformMessage
  ): Promise<void> {
    try {
      // Skip messages from bots
      if (platformMessage.author.isBot) {
        return;
      }

      // Convert platform message to chat message
      const chatMessage: ChatMessage = {
        role: 'user',
        content: platformMessage.content,
        timestamp: platformMessage.timestamp,
        userId: platformMessage.author.id,
        channelId: platformMessage.channel.id,
        platform: this.platformType,
      };

      // Process through chat agent
      const response = await this.chatAgent.processMessage(chatMessage);

      // Process through autonomous system if available
      if (this.autonomousSystem) {
        await this.autonomousSystem.processMessage(chatMessage);
      }

      // Send response if needed
      if (response.shouldReply && response.content.trim()) {
        await this.sendMessage(
          platformMessage.channel.id,
          response.content,
          {
            replyTo: platformMessage.id,
            ...(response.metadata && { metadata: response.metadata }),
          }
        );
      }
    } catch (error) {
      console.error(`Error handling message on ${this.platformType}:`, error);
      
      // Send error message to user
      try {
        await this.sendMessage(
          platformMessage.channel.id,
          'Sorry, I encountered an error processing your message. Please try again.'
        );
      } catch (sendError) {
        console.error(`Error sending error message on ${this.platformType}:`, sendError);
      }
    }
  }

  /**
   * Check if platform should respond to a message
   */
  protected abstract shouldRespond(message: PlatformMessage): boolean;

  /**
   * Convert platform-specific message to standard format
   */
  protected abstract convertToPlatformMessage(
    rawMessage: unknown
  ): PlatformMessage;
}