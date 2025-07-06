/**
 * Discord Bot implementation
 */

import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import type { Config } from '../../core/config.js';
import type { ChatAgent, ChatMessage } from '../../agents/chat-agent.js';
import type { AutonomousSystem } from '../../autonomous/index.js';
import { logger } from '../../utils/logger.js';

export class DiscordBot {
  private client: Client;
  private chatAgent: ChatAgent;
  private autonomousSystem: AutonomousSystem | null = null;
  private config: Config;

  constructor(config: Config, chatAgent: ChatAgent) {
    this.config = config;
    this.chatAgent = chatAgent;
    
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
   * Setup Discord event handlers
   */
  private setupEventHandlers(): void {
    // Bot ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      logger.info(`✅ Discord Bot logged in as ${readyClient.user.tag}`);
      logger.info(`🔗 Bot is connected to ${readyClient.guilds.cache.size} servers`);
    });

    // Message create event
    this.client.on(Events.MessageCreate, async (message) => {
      logger.debug(`Discord message received from ${message.author.tag}: ${message.content.substring(0, 50)}...`);
      await this.handleMessage(message);
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
   * Handle incoming Discord messages
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      // Log every message received for debugging
      const channelName = 'name' in message.channel ? message.channel.name : 'DM';
      logger.info(`[MESSAGE] From: ${message.author.tag} (${message.author.id}) in #${channelName}: "${message.content.substring(0, 100)}..."`);

      // Always skip messages from ourselves to prevent infinite loops
      if (message.author.id === this.client.user?.id) {
        logger.debug(`[SKIP] Message from self: ${message.author.tag}`);
        return;
      }
      
      // Skip if message is from a bot, EXCEPT for RSS channels where we want to process RSS bot messages
      const isRSSChannel = 'name' in message.channel && 
        message.channel.name && 
        this.isRSSChannelName(message.channel.name);
      
      if (message.author.bot && !isRSSChannel) {
        logger.debug(`[SKIP] Message from bot: ${message.author.tag} (not RSS channel)`);
        return;
      }
      
      if (message.author.bot && isRSSChannel) {
        logger.info(`[RSS_BOT] Processing RSS bot message from: ${message.author.tag} in #${message.channel.name}`);
      }

      // Skip if message is empty
      if (!message.content.trim()) {
        logger.debug(`[SKIP] Empty message from: ${message.author.tag}`);
        return;
      }

      // Check if the bot should respond
      const shouldRespond = this.shouldRespond(message);
      logger.info(`[SHOULD_RESPOND] Channel: #${channelName}, Result: ${shouldRespond}`);
      if (!shouldRespond) {
        return;
      }

      logger.debug('Processing Discord message:', {
        userId: message.author.id,
        channelId: message.channel.id,
        guildId: message.guild?.id,
        content: message.content.substring(0, 100) + '...'
      });

      // Convert Discord message to ChatMessage
      const chatMessage: ChatMessage = {
        role: 'user',
        content: message.content,
        timestamp: new Date(message.createdTimestamp),
        userId: message.author.id,
        channelId: message.channel.id,
        platform: 'discord',
      };

      // Send typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Check if this is an RSS channel - if so, skip normal chat agent processing
      const isRSSProcessing = channelName && channelName !== 'DM' && this.isRSSChannelName(channelName) && message.author.bot;
      
      let response;
      if (!isRSSProcessing) {
        // Process message through chat agent only for non-RSS bot messages
        response = await this.chatAgent.processMessage(chatMessage);
      }

      // Also process through autonomous system for triggers
      if (this.autonomousSystem) {
        logger.info(`[AUTONOMOUS] Processing message in channel: ${channelName}, content: ${message.content.substring(0, 100)}`);
        await this.autonomousSystem.processMessage(chatMessage, channelName);
        logger.info(`[AUTONOMOUS] Completed processing for channel: ${channelName}`);
      } else {
        logger.warn(`[AUTONOMOUS] No autonomous system available!`);
      }

      // Send response if needed (but not for RSS bot messages)
      if (response?.shouldReply && response.content.trim() && !isRSSProcessing) {
        await this.sendResponse(message, response.content);
      }
    } catch (error) {
      logger.error('Error handling Discord message:', error);
      
      // Send error message to user
      try {
        await message.reply('Sorry, I encountered an error processing your message. Please try again.');
      } catch (replyError) {
        logger.error('Error sending error message:', replyError);
      }
    }
  }

  /**
   * Determine if the bot should respond to a message
   */
  private shouldRespond(message: Message): boolean {
    // Always respond to DMs
    if (message.channel.type === 1) { // DM_CHANNEL
      return true;
    }

    // Check if this is a designated bot channel (e.g., #aias, #rss)
    if ('name' in message.channel) {
      const channelName = message.channel.name?.toLowerCase();
      // Respond to all messages in bot-specific channels
      if (channelName === 'aias' || channelName?.includes('bot') || channelName?.includes('ai') || 
          channelName === 'rss' || channelName?.includes('feed') || channelName?.includes('news') || channelName?.includes('links')) {
        logger.debug(`Responding to message in bot channel: #${channelName}`);
        return true;
      }
    }

    // Respond if bot is mentioned
    if (message.mentions.has(this.client.user!)) {
      return true;
    }

    // Respond if message starts with bot mention
    if (message.content.startsWith(`<@${this.client.user?.id}>`)) {
      return true;
    }

    // For general channels, only respond if the message seems directed at the bot
    const lowerContent = message.content.toLowerCase();
    const botNames = ['aias', 'アイアス', 'あいあす'];
    
    // Check if any bot name is mentioned in the message
    if (botNames.some(name => lowerContent.includes(name))) {
      logger.debug('Responding to message containing bot name');
      return true;
    }

    return false;
  }

  /**
   * Check if channel name is RSS channel (helper method)
   */
  private isRSSChannelName(channelName: string): boolean {
    const lowerName = channelName.toLowerCase();
    const rssNames = ['rss', 'feed', 'news', 'links', 'リンク', 'ニュース', 'フィード'];
    return rssNames.some(name => lowerName.includes(name));
  }

  /**
   * Send response to Discord
   */
  private async sendResponse(originalMessage: Message, content: string): Promise<void> {
    try {
      // Split long messages if needed
      const maxLength = 2000;
      if (content.length <= maxLength) {
        await originalMessage.reply(content);
      } else {
        // Split into chunks
        const chunks = this.splitMessage(content, maxLength);
        
        // Send first chunk as reply
        await originalMessage.reply(chunks[0] || '');
        
        // Send remaining chunks as regular messages
        for (let i = 1; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (chunk && 'send' in originalMessage.channel) {
            await originalMessage.channel.send(chunk);
          }
        }
      }
    } catch (error) {
      logger.error('Error sending Discord response:', error);
      throw error;
    }
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
   * Start the Discord bot
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Discord Bot...');
      await this.client.login(this.config.discord.token);
    } catch (error) {
      logger.error('Failed to start Discord Bot:', error);
      throw error;
    }
  }

  /**
   * Stop the Discord bot
   */
  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping Discord Bot...');
      await this.client.destroy();
      logger.info('✅ Discord Bot stopped');
    } catch (error) {
      logger.error('Error stopping Discord Bot:', error);
      throw error;
    }
  }

  /**
   * Send message to a specific channel
   */
  async sendMessageToChannel(channelId: string, content: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'send' in channel) {
        // Split long messages if needed
        const maxLength = 2000;
        if (content.length <= maxLength) {
          await channel.send(content);
        } else {
          // Split into chunks
          const chunks = this.splitMessage(content, maxLength);
          for (const chunk of chunks) {
            if (chunk) {
              await channel.send(chunk);
              // Small delay between chunks
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        logger.info(`Message sent to channel ${channelId}`);
      } else {
        logger.error(`Channel ${channelId} not found or not a text channel`);
      }
    } catch (error) {
      logger.error(`Error sending message to channel ${channelId}:`, error);
    }
  }

  /**
   * Set autonomous system for integration
   */
  setAutonomousSystem(autonomousSystem: AutonomousSystem): void {
    this.autonomousSystem = autonomousSystem;
    
    // Set RSS message sending callback
    autonomousSystem.setRSSMessageCallback(async (channelId: string, platform: string, content: string) => {
      if (platform === 'discord') {
        await this.sendMessageToChannel(channelId, content);
      }
    });
    
    logger.info('Autonomous system connected to Discord Bot');
  }

  /**
   * Get bot status
   */
  getStatus(): {
    connected: boolean;
    guilds: number;
    user: string | null;
    autonomousSystemConnected: boolean;
  } {
    return {
      connected: this.client.isReady(),
      guilds: this.client.guilds.cache.size,
      user: this.client.user?.tag || null,
      autonomousSystemConnected: this.autonomousSystem !== null,
    };
  }
}