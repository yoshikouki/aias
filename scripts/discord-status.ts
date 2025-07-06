#!/usr/bin/env tsx
/**
 * Discord Bot Status Check Script
 */

// Load environment variables
import 'dotenv/config';

import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/core/config.js';

async function checkDiscordStatus(): Promise<void> {
  try {
    // Load configuration
    const configResult = loadConfig();
    if (!configResult.success) {
      throw new Error(`Configuration error: ${configResult.error}`);
    }
    const config = configResult.config;

    // Create Discord client
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Setup event handlers
    client.once('ready', () => {
      logger.info('🤖 Discord Bot Status Check');
      logger.info(`✅ Bot logged in as: ${client.user?.tag}`);
      logger.info(`📊 Bot ID: ${client.user?.id}`);
      logger.info(`🔗 Connected to ${client.guilds.cache.size} server(s)`);
      
      // List all servers
      client.guilds.cache.forEach((guild) => {
        logger.info(`  - Server: ${guild.name} (ID: ${guild.id})`);
        logger.info(`    - Members: ${guild.memberCount}`);
        logger.info(`    - Channels: ${guild.channels.cache.size}`);
        
        // List text channels
        const textChannels = guild.channels.cache.filter(channel => channel.type === 0);
        logger.info(`    - Text channels: ${textChannels.size}`);
        textChannels.forEach(channel => {
          logger.info(`      - #${channel.name} (ID: ${channel.id})`);
        });
      });

      // Check bot permissions
      client.guilds.cache.forEach((guild) => {
        const botMember = guild.members.cache.get(client.user!.id);
        if (botMember) {
          const permissions = botMember.permissions.toArray();
          logger.info(`\n📝 Permissions in ${guild.name}:`);
          logger.info(`  - Send Messages: ${permissions.includes('SendMessages')}`);
          logger.info(`  - Read Message History: ${permissions.includes('ReadMessageHistory')}`);
          logger.info(`  - View Channels: ${permissions.includes('ViewChannel')}`);
          logger.info(`  - Add Reactions: ${permissions.includes('AddReactions')}`);
        }
      });

      // Disconnect after status check
      setTimeout(() => {
        logger.info('\n✅ Status check complete');
        client.destroy();
        process.exit(0);
      }, 2000);
    });

    // Error handling
    client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    // Login
    logger.info('🔌 Connecting to Discord...');
    await client.login(config.discord.token);

  } catch (error) {
    logger.error('Failed to check Discord status:', error);
    process.exit(1);
  }
}

// Run status check
checkDiscordStatus().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});