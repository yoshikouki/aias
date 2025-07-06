/**
 * Scheduler for autonomous actions
 */

import { logger } from '../utils/logger.js';

export interface ScheduledTask {
  id: string;
  name: string;
  interval: number; // in milliseconds
  action: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class AutonomousScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * Add a scheduled task
   */
  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, {
      ...task,
      nextRun: new Date(Date.now() + task.interval),
    });
    
    logger.info(`Scheduled task added: ${task.name} (${task.id})`);
    
    if (this.isRunning && task.enabled) {
      this.scheduleTask(task);
    }
  }

  /**
   * Remove a scheduled task
   */
  removeTask(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
    
    this.tasks.delete(taskId);
    logger.info(`Scheduled task removed: ${taskId}`);
  }

  /**
   * Enable or disable a task
   */
  setTaskEnabled(taskId: string, enabled: boolean): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn(`Task not found: ${taskId}`);
      return;
    }

    task.enabled = enabled;
    
    if (enabled && this.isRunning) {
      this.scheduleTask(task);
    } else {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
    }
    
    logger.info(`Task ${taskId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Autonomous scheduler started');

    // Schedule all enabled tasks
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    logger.info('Autonomous scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    tasksCount: number;
    activeTasks: number;
    tasks: Array<{
      id: string;
      name: string;
      enabled: boolean;
      lastRun?: string;
      nextRun?: string;
    }>;
  } {
    const tasks = Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      ...(task.lastRun && { lastRun: task.lastRun.toISOString() }),
      ...(task.nextRun && { nextRun: task.nextRun.toISOString() }),
    }));

    return {
      running: this.isRunning,
      tasksCount: this.tasks.size,
      activeTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
      tasks,
    };
  }

  /**
   * Schedule a single task
   */
  private scheduleTask(task: ScheduledTask): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(task.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Create new interval
    const interval = setInterval(async () => {
      try {
        logger.debug(`Executing scheduled task: ${task.name}`);
        
        task.lastRun = new Date();
        task.nextRun = new Date(Date.now() + task.interval);
        
        await task.action();
        
        logger.debug(`Task completed: ${task.name}`);
      } catch (error) {
        logger.error(`Error executing task ${task.name}:`, error);
      }
    }, task.interval);

    this.intervals.set(task.id, interval);
  }
}