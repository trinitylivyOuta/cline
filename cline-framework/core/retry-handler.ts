/**
 * Retry Handler with Backoff
 * Provides automatic retry logic for API calls with exponential backoff
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  nextDelay: number;
}

export type RetryCallback = (context: RetryContext) => void;

/**
 * Error classifications
 */
export enum ErrorType {
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  AUTH = 'auth',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * Classify an error
 */
export function classifyError(error: any): ErrorType {
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.statusCode;
  
  // Rate limiting
  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorType.RATE_LIMIT;
  }
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ENOTFOUND'
  ) {
    return ErrorType.NETWORK;
  }
  
  // Timeout errors
  if (message.includes('timeout') || error.code === 'ETIMEDOUT') {
    return ErrorType.TIMEOUT;
  }
  
  // Server errors (5xx)
  if (status >= 500 && status < 600) {
    return ErrorType.SERVER;
  }
  
  // Auth errors
  if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorType.AUTH;
  }
  
  // Validation errors (4xx except 401, 403, 429)
  if (status >= 400 && status < 500) {
    return ErrorType.VALIDATION;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: any): boolean {
  const type = classifyError(error);
  
  // Retryable error types
  return [
    ErrorType.RATE_LIMIT,
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.SERVER,
  ].includes(type);
}

/**
 * Retry Handler
 * Handles automatic retries with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig;
  
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 60000,
      backoffMultiplier: config.backoffMultiplier || 2,
      retryableErrors: config.retryableErrors || [
        ErrorType.RATE_LIMIT,
        ErrorType.NETWORK,
        ErrorType.TIMEOUT,
        ErrorType.SERVER,
      ],
    };
  }
  
  /**
   * Calculate delay for next retry
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelay);
  }
  
  /**
   * Add jitter to delay (random ±20%)
   */
  private addJitter(delay: number): number {
    const jitter = delay * 0.2;
    return delay + (Math.random() * 2 - 1) * jitter;
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: RetryCallback
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if we should retry
        if (attempt >= this.config.maxRetries || !isRetryable(error)) {
          throw this.createRetryError(error, attempt);
        }
        
        // Calculate delay
        const baseDelay = this.calculateDelay(attempt);
        const delay = this.addJitter(baseDelay);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            lastError: error,
            nextDelay: delay,
          });
        }
        
        // Wait before retry
        await this.sleep(delay);
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown retry error');
  }
  
  /**
   * Create detailed retry error
   */
  private createRetryError(originalError: any, attempts: number): Error {
    const errorType = classifyError(originalError);
    const message = `Failed after ${attempts + 1} attempts (${errorType}): ${originalError.message}`;
    
    const error = new Error(message);
    (error as any).originalError = originalError;
    (error as any).attempts = attempts + 1;
    (error as any).errorType = errorType;
    
    return error;
  }
}

/**
 * Decorator for automatic retry
 */
export function withRetry<T>(
  config?: Partial<RetryConfig>
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const handler = new RetryHandler(config);
    
    descriptor.value = async function (...args: any[]) {
      return handler.execute(() => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}
