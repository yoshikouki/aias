/**
 * Platform Manager - Manages multiple platform integrations
 */

import { logger } from '../utils/logger.js';
import type { ChatAgent } from '../agents/chat-agent.js';
import type { AutonomousSystem } from '../autonomous/index.js';
import type { 
  BasePlatform, 
  PlatformType, 
  PlatformConfig, 
  PlatformStatus,
  PlatformCapabilities
} from './base/platform-interface.js';

export interface PlatformManagerConfig {
  platforms: Record<PlatformType, PlatformConfig>;
}

export interface PlatformInfo {
  type: PlatformType;
  enabled: boolean;
  status: PlatformStatus;
  capabilities: PlatformCapabilities;
}

export class PlatformManager {
  private platforms: Map<PlatformType, BasePlatform> = new Map();
  private chatAgent: ChatAgent;
  private autonomousSystem: AutonomousSystem | null = null;
  private config: PlatformManagerConfig;

  constructor(config: PlatformManagerConfig, chatAgent: ChatAgent) {
    this.config = config;
    this.chatAgent = chatAgent;
  }

  /**
   * Set autonomous system for all platforms
   */
  setAutonomousSystem(autonomousSystem: AutonomousSystem): void {
    this.autonomousSystem = autonomousSystem;
    
    // Set autonomous system for all existing platforms
    for (const platform of this.platforms.values()) {
      platform.setAutonomousSystem(autonomousSystem);
    }
  }

  /**
   * Register a platform implementation
   */
  registerPlatform(platform: BasePlatform): void {
    const platformType = platform.getType();
    
    if (this.platforms.has(platformType)) {
      logger.warn(`Platform ${platformType} is already registered, replacing...`);
    }

    // Set autonomous system if available
    if (this.autonomousSystem) {
      platform.setAutonomousSystem(this.autonomousSystem);
    }

    this.platforms.set(platformType, platform);
    logger.info(`Platform registered: ${platformType}`);
  }

  /**
   * Initialize all enabled platforms
   */
  async initializeAll(): Promise<void> {
    logger.info('Initializing all platforms...');

    const initPromises: Promise<void>[] = [];

    for (const [platformType, platform] of this.platforms.entries()) {
      const config = this.config.platforms[platformType];
      
      if (config?.enabled) {
        logger.info(`Initializing platform: ${platformType}`);
        initPromises.push(
          platform.initialize().catch(error => {
            logger.error(`Failed to initialize platform ${platformType}:`, error);
            throw error;
          })
        );
      } else {
        logger.info(`Platform ${platformType} is disabled, skipping initialization`);
      }
    }

    try {
      await Promise.all(initPromises);
      logger.info('All platforms initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize some platforms:', error);
      throw error;
    }
  }

  /**
   * Start all enabled platforms
   */
  async startAll(): Promise<void> {
    logger.info('Starting all platforms...');

    const startPromises: Promise<void>[] = [];

    for (const [platformType, platform] of this.platforms.entries()) {
      const config = this.config.platforms[platformType];
      
      if (config?.enabled) {
        logger.info(`Starting platform: ${platformType}`);
        startPromises.push(
          platform.start().catch(error => {
            logger.error(`Failed to start platform ${platformType}:`, error);
            throw error;
          })
        );
      }
    }

    try {
      await Promise.all(startPromises);
      logger.info('All platforms started successfully');
    } catch (error) {
      logger.error('Failed to start some platforms:', error);
      throw error;
    }
  }

  /**
   * Stop all platforms
   */
  async stopAll(): Promise<void> {
    logger.info('Stopping all platforms...');

    const stopPromises: Promise<void>[] = [];

    for (const [platformType, platform] of this.platforms.entries()) {
      logger.info(`Stopping platform: ${platformType}`);
      stopPromises.push(
        platform.stop().catch(error => {
          logger.error(`Failed to stop platform ${platformType}:`, error);
        })
      );
    }

    try {
      await Promise.all(stopPromises);
      logger.info('All platforms stopped');
    } catch (error) {
      logger.error('Some platforms failed to stop cleanly:', error);
    }
  }

  /**
   * Get a specific platform
   */
  getPlatform(platformType: PlatformType): BasePlatform | null {
    return this.platforms.get(platformType) || null;
  }

  /**
   * Get all registered platforms
   */
  getAllPlatforms(): BasePlatform[] {
    return Array.from(this.platforms.values());
  }

  /**
   * Send message to a specific platform
   */
  async sendMessage(
    platformType: PlatformType,
    channelId: string,
    content: string,
    options?: {
      replyTo?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    const platform = this.platforms.get(platformType);
    
    if (!platform) {
      logger.error(`Platform ${platformType} not found`);
      return false;
    }

    try {
      const result = await platform.sendMessage(channelId, content, options);
      return result.success;
    } catch (error) {
      logger.error(`Failed to send message via ${platformType}:`, error);
      return false;
    }
  }

  /**
   * Broadcast message to all enabled platforms
   */
  async broadcastMessage(
    channelMappings: Record<PlatformType, string>,
    content: string,
    options?: {
      metadata?: Record<string, unknown>;
    }
  ): Promise<Record<PlatformType, boolean>> {
    const results: Record<string, boolean> = {};

    const sendPromises = Object.entries(channelMappings).map(async ([platformType, channelId]) => {
      const platform = this.platforms.get(platformType as PlatformType);
      
      if (!platform) {
        results[platformType] = false;
        return;
      }

      try {
        const result = await platform.sendMessage(channelId, content, options);
        results[platformType] = result.success;
      } catch (error) {
        logger.error(`Failed to broadcast to ${platformType}:`, error);
        results[platformType] = false;
      }
    });

    await Promise.all(sendPromises);
    return results as Record<PlatformType, boolean>;
  }

  /**
   * Get status of all platforms
   */
  getStatus(): {
    totalPlatforms: number;
    enabledPlatforms: number;
    connectedPlatforms: number;
    platforms: PlatformInfo[];
  } {
    const platforms: PlatformInfo[] = [];
    let connectedCount = 0;
    let enabledCount = 0;

    for (const [platformType, platform] of this.platforms.entries()) {
      const config = this.config.platforms[platformType];
      const enabled = config?.enabled || false;
      const status = platform.getStatus();
      const capabilities = platform.getCapabilities();

      if (enabled) {
        enabledCount++;
      }

      if (status.connected) {
        connectedCount++;
      }

      platforms.push({
        type: platformType,
        enabled,
        status,
        capabilities,
      });
    }

    return {
      totalPlatforms: this.platforms.size,
      enabledPlatforms: enabledCount,
      connectedPlatforms: connectedCount,
      platforms,
    };
  }

  /**
   * Check platform health
   */
  async healthCheck(): Promise<Record<PlatformType, {
    healthy: boolean;
    lastCheck: Date;
    error?: string;
  }>> {
    const health: Record<string, any> = {};

    for (const [platformType, platform] of this.platforms.entries()) {
      const checkTime = new Date();
      
      try {
        const status = platform.getStatus();
        health[platformType] = {
          healthy: status.connected && status.authenticated,
          lastCheck: checkTime,
        };
      } catch (error) {
        health[platformType] = {
          healthy: false,
          lastCheck: checkTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return health as Record<PlatformType, {
      healthy: boolean;
      lastCheck: Date;
      error?: string;
    }>;
  }

  /**
   * Get platform statistics
   */
  getStatistics(): {
    totalServers: number;
    totalChannels: number;
    totalUsers: number;
    platformBreakdown: Record<PlatformType, {
      servers: number;
      channels: number;
      users: number;
    }>;
  } {
    let totalServers = 0;
    let totalChannels = 0;
    let totalUsers = 0;
    const platformBreakdown: Record<string, any> = {};

    for (const [platformType, platform] of this.platforms.entries()) {
      const status = platform.getStatus();
      
      const servers = status.serverCount || 0;
      const channels = status.channelCount || 0;
      const users = status.userCount || 0;

      totalServers += servers;
      totalChannels += channels;
      totalUsers += users;

      platformBreakdown[platformType] = {
        servers,
        channels,
        users,
      };
    }

    return {
      totalServers,
      totalChannels,
      totalUsers,
      platformBreakdown: platformBreakdown as Record<PlatformType, {
        servers: number;
        channels: number;
        users: number;
      }>,
    };
  }
}