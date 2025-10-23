/**
 * Structured Logging System
 * Provides consistent logging with levels and formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  context?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
  colors?: boolean;
  output?: (entry: LogEntry) => void;
}

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private context?: string;
  
  constructor(config: Partial<LoggerConfig> = {}, context?: string) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      prefix: config.prefix,
      timestamps: config.timestamps ?? true,
      colors: config.colors ?? true,
      output: config.output,
    };
    this.context = context;
  }
  
  /**
   * Create child logger with context
   */
  child(context: string): Logger {
    return new Logger(this.config, context);
  }
  
  /**
   * Debug log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Info log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Warning log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Error log
   */
  error(message: string, error?: Error | any): void {
    const data = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      ...(error as any),
    } : error;
    
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.config.level) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      data,
      context: this.context,
    };
    
    if (this.config.output) {
      this.config.output(entry);
    } else {
      this.defaultOutput(entry);
    }
  }
  
  /**
   * Default console output
   */
  private defaultOutput(entry: LogEntry): void {
    const parts: string[] = [];
    
    // Timestamp
    if (this.config.timestamps) {
      const time = entry.timestamp.split('T')[1]?.slice(0, 12) || '';
      parts.push(this.gray(`[${time}]`));
    }
    
    // Prefix
    if (this.config.prefix) {
      parts.push(this.gray(`[${this.config.prefix}]`));
    }
    
    // Context
    if (entry.context) {
      parts.push(this.gray(`[${entry.context}]`));
    }
    
    // Level
    const levelColor = this.getLevelColor(entry.level);
    parts.push(levelColor(`[${entry.level}]`));
    
    // Message
    parts.push(entry.message);
    
    const line = parts.join(' ');
    
    // Output
    if (entry.level === 'ERROR') {
      console.error(line);
      if (entry.data) {
        console.error(entry.data);
      }
    } else if (entry.level === 'WARN') {
      console.warn(line);
      if (entry.data) {
        console.warn(entry.data);
      }
    } else {
      console.log(line);
      if (entry.data) {
        console.log(entry.data);
      }
    }
  }
  
  /**
   * Get color function for log level
   */
  private getLevelColor(level: string): (text: string) => string {
    if (!this.config.colors) {
      return (text) => text;
    }
    
    switch (level) {
      case 'DEBUG':
        return this.gray;
      case 'INFO':
        return this.blue;
      case 'WARN':
        return this.yellow;
      case 'ERROR':
        return this.red;
      default:
        return (text) => text;
    }
  }
  
  /**
   * Color functions
   */
  private gray(text: string): string {
    return this.config.colors ? `\x1b[90m${text}\x1b[0m` : text;
  }
  
  private blue(text: string): string {
    return this.config.colors ? `\x1b[34m${text}\x1b[0m` : text;
  }
  
  private yellow(text: string): string {
    return this.config.colors ? `\x1b[33m${text}\x1b[0m` : text;
  }
  
  private red(text: string): string {
    return this.config.colors ? `\x1b[31m${text}\x1b[0m` : text;
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * Set global logger
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Configure global logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalLogger = new Logger(config);
}
