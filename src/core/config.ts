/**
 * Configuration management for AIAS
 */

import { z } from 'zod';
import path from 'path';

// Environment variables schema
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required' }),
  DISCORD_TOKEN: z.string().min(1, { message: 'DISCORD_TOKEN is required' }),
  DATABASE_PATH: z.string().optional().default('./data/aias.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEBUG: z.string().optional().default('true'),
});

// Configuration type
export type Config = {
  gemini: {
    apiKey: string;
  };
  discord: {
    token: string;
  };
  database: {
    path: string;
  };
  app: {
    nodeEnv: 'development' | 'production' | 'test';
    debug: boolean;
  };
};

// Result type for configuration loading
export type ConfigResult = 
  | { success: true; config: Config }
  | { success: false; error: string };

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): ConfigResult {
  try {
    // Parse environment variables
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.errors
        .map(error => `${error.path.join('.')}: ${error.message}`)
        .join(', ');
      
      return {
        success: false,
        error: `Configuration validation failed: ${errors}`
      };
    }
    
    const env = result.data;
    
    // Create configuration object
    const config: Config = {
      gemini: {
        apiKey: env.GEMINI_API_KEY,
      },
      discord: {
        token: env.DISCORD_TOKEN,
      },
      database: {
        path: path.resolve(env.DATABASE_PATH),
      },
      app: {
        nodeEnv: env.NODE_ENV,
        debug: Boolean(env.DEBUG),
      },
    };
    
    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}