/**
 * Discord Platform Implementation
 */

import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import type { ChatAgent } from '../../agents/chat-agent.js';
import { logger } from '../../utils/logger.js';
import { 
  BasePlatform, 
  type PlatformConfig, 
  type PlatformMessage, 
  type PlatformResponse,
  type PlatformStatus,
  type PlatformCapabilities
} from '../base/platform-interface.js';

export interface DiscordConfig extends PlatformConfig {
  credentials: {
    token: string;
  };
}

export class DiscordPlatform extends BasePlatform {
  private client: Client;
  private discordConfig: DiscordConfig;

  constructor(config: DiscordConfig, chatAgent: ChatAgent) {
    super('discord', config, chatAgent);
    this.discordConfig = config;
    
    // Initialize Discord client with necessary intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      messaging: {
        canSend: true,
        canReceive: true,
        canEdit: true,
        canDelete: true,
        maxLength: 2000,
        supportsMarkdown: true,
        supportsEmbeds: true,
        supportsThreads: true,
      },
      reactions: {
        canAdd: true,
        canRemove: true,
        customEmojis: true,
      },
      files: {
        canUpload: true,
        canDownload: true,
        maxSize: 8 * 1024 * 1024, // 8MB
        supportedTypes: ['image/*', 'video/*', 'audio/*', 'text/*', 'application/*'],
      },
      commands: {
        supportsSlashCommands: true,
        supportsPrefixCommands: true,
        customCommands: true,
      },
      events: {
        supportedEvents: [
          'message',
          'messageUpdate',
          'messageDelete',
          'memberJoin',
          'memberLeave',
          'roleUpdate',
        ],
        webhookSupport: true,
      },
    };
  }

  /**
   * Initialize the Discord platform
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Discord platform...');
    // Discord client initialization is done in constructor
    logger.info('Discord platform initialized');
  }

  /**
   * Start the Discord connection
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Discord platform...');
      await this.client.login(this.discordConfig.credentials.token);
      logger.info('✅ Discord platform started');
    } catch (error) {
      logger.error('Failed to start Discord platform:', error);
      throw error;
    }
  }

  /**
   * Stop the Discord connection
   */
  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping Discord platform...');
      await this.client.destroy();
      logger.info('✅ Discord platform stopped');
    } catch (error) {
      logger.error('Error stopping Discord platform:', error);
      throw error;
    }
  }

  /**
   * Send a message to a Discord channel
   */
  async sendMessage(
    channelId: string,
    content: string,
    options?: {
      replyTo?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<PlatformResponse> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !('send' in channel)) {
        return {
          success: false,
          error: 'Channel not found or not a text channel',
        };
      }

      // Split long messages if needed
      const messages = this.splitMessage(content, 2000);
      const messageIds: string[] = [];

      for (let i = 0; i < messages.length; i++) {
        const messageContent = messages[i];
        if (!messageContent) continue;

        let sentMessage: Message;
        
        if (i === 0 && options?.replyTo) {
          // First message as reply
          try {
            const replyMessage = await channel.messages.fetch(options.replyTo);
            sentMessage = await replyMessage.reply(messageContent);
          } catch {
            // Fallback to regular message if reply fails
            sentMessage = await channel.send(messageContent);
          }
        } else {
          // Regular message
          sentMessage = await channel.send(messageContent);
        }

        messageIds.push(sentMessage.id);
      }

      return {
        success: true,
        ...(messageIds[0] && { messageId: messageIds[0] }),
        metadata: {
          messageIds,
          splitCount: messages.length,
        },
      };
    } catch (error) {
      logger.error('Error sending Discord message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channelId: string,
    messageId: string,
    reaction: string
  ): Promise<PlatformResponse> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !('messages' in channel)) {
        return {
          success: false,
          error: 'Channel not found or not a text channel',
        };
      }

      const message = await channel.messages.fetch(messageId);
      await message.react(reaction);

      return { success: true };
    } catch (error) {
      logger.error('Error adding Discord reaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload a file to Discord
   */
  async uploadFile(
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
  ): Promise<PlatformResponse> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !('send' in channel)) {
        return {
          success: false,
          error: 'Channel not found or not a text channel',
        };
      }

      const messageOptions: any = {
        files: [{
          attachment: file.data,
          name: file.name,
        }],
      };

      if (options?.caption) {
        messageOptions.content = options.caption;
      }

      const sentMessage = await channel.send(messageOptions);

      return {
        success: true,
        messageId: sentMessage.id,
        metadata: {
          fileName: file.name,
          fileSize: file.data.length,
          contentType: file.contentType,
        },
      };
    } catch (error) {
      logger.error('Error uploading file to Discord:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Discord platform status
   */
  getStatus(): PlatformStatus {
    return {
      connected: this.client.isReady(),
      authenticated: this.client.isReady(),
      lastActivity: new Date(),
      serverCount: this.client.guilds.cache.size,
      channelCount: this.client.channels.cache.size,
      userCount: this.client.users.cache.size,
      metadata: {
        user: this.client.user?.tag || null,
        ping: this.client.ws.ping,
        uptime: this.client.uptime,
      },
    };
  }

  /**
   * Check if platform should respond to a message
   */
  protected shouldRespond(message: PlatformMessage): boolean {
    // Always respond to DMs
    if (message.channel.type === 'dm') {
      return true;
    }

    // Check if bot is mentioned
    const botUser = this.client.user;
    if (botUser && message.content.includes(`<@${botUser.id}>`)) {
      return true;
    }

    // For now, don't respond to general channel messages
    // This can be configured later for specific channels
    return false;
  }

  /**
   * Convert Discord message to platform message
   */
  protected convertToPlatformMessage(discordMessage: Message): PlatformMessage {
    return {
      id: discordMessage.id,
      content: discordMessage.content,
      author: {
        id: discordMessage.author.id,
        name: discordMessage.author.username,
        isBot: discordMessage.author.bot,
      },
      channel: {
        id: discordMessage.channel.id,
        ...('name' in discordMessage.channel && discordMessage.channel.name && { name: discordMessage.channel.name }),
        type: this.getChannelType(discordMessage.channel.type),
      },
      timestamp: new Date(discordMessage.createdTimestamp),
      attachments: discordMessage.attachments.map(attachment => ({
        id: attachment.id,
        url: attachment.url,
        filename: attachment.name || 'unknown',
        contentType: attachment.contentType || 'application/octet-stream',
      })),
      metadata: {
        guild: discordMessage.guild?.id,
        member: discordMessage.member?.id,
      },
    };
  }

  /**
   * Setup Discord event handlers
   */
  private setupEventHandlers(): void {
    // Bot ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      logger.info(`✅ Discord Bot logged in as ${readyClient.user.tag}`);
      logger.info(`🔗 Bot is connected to ${readyClient.guilds.cache.size} servers`);
    });

    // Message create event
    this.client.on(Events.MessageCreate, async (discordMessage) => {
      try {
        const platformMessage = this.convertToPlatformMessage(discordMessage);
        
        // Skip if message is from a bot
        if (platformMessage.author.isBot) {
          return;
        }

        // Skip if message is empty
        if (!platformMessage.content.trim()) {
          return;
        }

        // Check if the bot should respond
        if (!this.shouldRespond(platformMessage)) {
          return;
        }

        // Send typing indicator
        if ('sendTyping' in discordMessage.channel) {
          await discordMessage.channel.sendTyping();
        }

        // Handle through base platform
        await this.handleIncomingMessage(platformMessage);
      } catch (error) {
        logger.error('Error handling Discord message:', error);
      }
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });

    // Disconnect handling
    this.client.on('disconnect' as any, () => {
      logger.warn('Discord bot disconnected');
    });

    // Reconnect handling
    this.client.on('reconnecting' as any, () => {
      logger.info('Discord bot reconnecting...');
    });
  }

  /**
   * Split long messages into chunks
   */
  private splitMessage(content: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find a good split point (prefer newlines, then spaces)
      let splitIndex = maxLength;
      const lastNewline = remaining.lastIndexOf('\n', maxLength);
      const lastSpace = remaining.lastIndexOf(' ', maxLength);

      if (lastNewline > maxLength * 0.8) {
        splitIndex = lastNewline;
      } else if (lastSpace > maxLength * 0.8) {
        splitIndex = lastSpace;
      }

      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex).trim();
    }

    return chunks;
  }

  /**
   * Convert Discord channel type to platform channel type
   */
  private getChannelType(discordChannelType: number): PlatformMessage['channel']['type'] {
    switch (discordChannelType) {
      case 0: // GUILD_TEXT
        return 'text';
      case 1: // DM
        return 'dm';
      case 2: // GUILD_VOICE
        return 'voice';
      case 10: // GUILD_NEWS_THREAD
      case 11: // GUILD_PUBLIC_THREAD
      case 12: // GUILD_PRIVATE_THREAD
        return 'thread';
      case 3: // GROUP_DM
        return 'group';
      default:
        return 'text';
    }
  }
}