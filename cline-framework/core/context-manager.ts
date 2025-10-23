/**
 * Context Window Management
 * Handles token counting, conversation summarization, and context optimization
 */

export interface ContextConfig {
  maxTokens: number;
  reservedTokens: number; // Reserve for response
  summaryThreshold: number; // When to summarize (% of max)
  priorityMessages?: number; // Number of recent messages to keep
}

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<any>;
  tokens?: number;
}

export interface ContextStats {
  totalTokens: number;
  messageCount: number;
  needsSummarization: boolean;
  availableTokens: number;
}

/**
 * Context Window Manager
 * Manages conversation history and token limits
 */
export class ContextManager {
  private config: ContextConfig;
  private messages: ContextMessage[] = [];
  private systemPrompt?: string;

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxTokens: config.maxTokens || 200000,
      reservedTokens: config.reservedTokens || 4096,
      summaryThreshold: config.summaryThreshold || 0.8,
      priorityMessages: config.priorityMessages || 5,
    };
  }

  /**
   * Estimate token count using heuristic (4 chars ≈ 1 token)
   */
  private estimateTokens(text: string): number {
    // Simple heuristic: ~4 characters per token
    // More accurate would use tiktoken but adds dependency
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in a message
   */
  private countMessageTokens(message: ContextMessage): number {
    if (message.tokens) return message.tokens;
    
    let text = '';
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      text = JSON.stringify(message.content);
    }
    
    const tokens = this.estimateTokens(text);
    message.tokens = tokens;
    return tokens;
  }

  /**
   * Add a message to the context
   */
  addMessage(message: ContextMessage): void {
    this.countMessageTokens(message);
    this.messages.push(message);
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Get current context statistics
   */
  getStats(): ContextStats {
    let totalTokens = 0;
    
    if (this.systemPrompt) {
      totalTokens += this.estimateTokens(this.systemPrompt);
    }
    
    for (const msg of this.messages) {
      totalTokens += this.countMessageTokens(msg);
    }
    
    const availableTokens = this.config.maxTokens - this.config.reservedTokens - totalTokens;
    const needsSummarization = totalTokens > (this.config.maxTokens * this.config.summaryThreshold);
    
    return {
      totalTokens,
      messageCount: this.messages.length,
      needsSummarization,
      availableTokens,
    };
  }

  /**
   * Optimize context by removing old messages
   */
  optimize(): void {
    const stats = this.getStats();
    
    if (!stats.needsSummarization) {
      return;
    }
    
    // Keep priority messages (most recent)
    const priorityCount = this.config.priorityMessages || 5;
    const messagesToKeep = this.messages.slice(-priorityCount);
    const messagesToSummarize = this.messages.slice(0, -priorityCount);
    
    if (messagesToSummarize.length > 0) {
      // Create summary message
      const summary = this.createSummary(messagesToSummarize);
      this.messages = [summary, ...messagesToKeep];
    }
  }

  /**
   * Create a summary of messages
   */
  private createSummary(messages: ContextMessage[]): ContextMessage {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    
    const summaryText = `[Previous conversation summary: ${messages.length} messages (${userMessages} user, ${assistantMessages} assistant) condensed for context management]`;
    
    return {
      role: 'assistant',
      content: summaryText,
      tokens: this.estimateTokens(summaryText),
    };
  }

  /**
   * Get messages for API call
   */
  getMessages(): ContextMessage[] {
    this.optimize();
    return [...this.messages];
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string | undefined {
    return this.systemPrompt;
  }

  /**
   * Clear context
   */
  clear(): void {
    this.messages = [];
    this.systemPrompt = undefined;
  }

  /**
   * Export context state
   */
  export(): { system?: string; messages: ContextMessage[] } {
    return {
      system: this.systemPrompt,
      messages: [...this.messages],
    };
  }

  /**
   * Import context state
   */
  import(state: { system?: string; messages: ContextMessage[] }): void {
    this.systemPrompt = state.system;
    this.messages = [...state.messages];
  }
}
