// src/core/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;
  private enabled: boolean;

  constructor(context: string, enabled: boolean = true) {
    this.context = context;
    this.enabled = enabled;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    if (args.length > 0) {
      console.log(prefix, message, ...args);
    } else {
      console.log(prefix, message);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }
}