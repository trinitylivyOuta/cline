/**
 * Layer 2: Simple LLM Application - Single request-response pattern
 */

import { LLMClient, LLMClientConfig, CompletionRequest, StreamChunk } from './llm-client';

/**
 * Tool definition for simple LLM
 */
export interface SimpleTool {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: Record<string, any>, context: SimpleToolContext) => Promise<SimpleToolResult>;
}

/**
 * Tool execution context
 */
export interface SimpleToolContext {
  conversationHistory: ConversationMessage[];
  metadata: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface SimpleToolResult {
  status: 'success' | 'error';
  output: string;
  error?: string;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * Response from LLM
 */
export interface LLMResponse {
  text: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: any;
  }>;
  stopReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Configuration for Simple LLM
 */
export interface SimpleLLMConfig extends LLMClientConfig {
  systemPrompt?: string;
  conversationConfig?: {
    maxMessages?: number;
    summarizeAfter?: number;
    includeSystem?: boolean;
  };
  toolPolicy?: {
    requireApproval?: string[]; // Tools that need approval
    autoApprove?: string[]; // Tools that auto-approve
    timeout?: number;
  };
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  executeTool?: (toolCall: { name: string; input: any }) => Promise<boolean>;
  onStream?: (text: string) => void;
  metadata?: Record<string, any>;
}

/**
 * Simple LLM Application - Layer 2
 * 
 * Provides single request-response pattern with conversation management.
 * Use this for chatbots, Q&A systems, and single-turn tool calling.
 */
export class SimpleLLM {
  private client: LLMClient;
  private config: SimpleLLMConfig;
  private conversation: ConversationMessage[] = [];
  private tools: Map<string, SimpleTool> = new Map();
  private systemPrompt: string;

  constructor(config: SimpleLLMConfig) {
    this.config = config;
    this.client = new LLMClient(config);
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
    
    // Add system message if configured
    if (config.conversationConfig?.includeSystem !== false) {
      this.conversation.push({
        role: 'system',
        content: this.systemPrompt,
        timestamp: new Date()
      });
    }
  }

  /**
   * Add a tool to the application
   */
  addTool(tool: SimpleTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get all registered tools
   */
  getTools(): SimpleTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    message: string,
    options: SendMessageOptions = {}
  ): Promise<LLMResponse> {
    // Add user message to conversation
    this.conversation.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: options.metadata
    });

    // Manage conversation history size
    this.manageConversationSize();

    // Prepare request
    const request: CompletionRequest = {
      system: this.systemPrompt,
      messages: this.conversation
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
      stream: !!options.onStream
    };

    // Get response
    let fullText = '';
    let toolCalls: Array<{ id: string; name: string; input: any }> = [];
    let stopReason: string | undefined;
    let usage: { inputTokens: number; outputTokens: number } | undefined;

    for await (const chunk of this.client.streamCompletion(request)) {
      if (chunk.type === 'text_delta') {
        fullText += chunk.text;
        if (options.onStream) {
          options.onStream(chunk.text);
        }
      } else if (chunk.type === 'tool_use') {
        toolCalls.push({
          id: chunk.id,
          name: chunk.name,
          input: chunk.input
        });
      } else if (chunk.type === 'done') {
        stopReason = chunk.stop_reason;
      } else if (chunk.type === 'usage') {
        usage = {
          inputTokens: chunk.input_tokens,
          outputTokens: chunk.output_tokens
        };
      } else if (chunk.type === 'error') {
        throw chunk.error;
      }
    }

    // Add assistant response to conversation
    this.conversation.push({
      role: 'assistant',
      content: fullText,
      timestamp: new Date()
    });

    // Execute tools if requested and approved
    if (toolCalls.length > 0 && options.executeTool) {
      for (const toolCall of toolCalls) {
        const approved = await options.executeTool(toolCall);
        
        if (approved) {
          const result = await this.executeTool(toolCall.name, toolCall.input);
          
          // Add tool result to conversation
          this.conversation.push({
            role: 'user',
            content: `Tool ${toolCall.name} result: ${result.output}`,
            timestamp: new Date()
          });
        }
      }
    }

    return {
      text: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage
    };
  }

  /**
   * Execute a tool
   */
  private async executeTool(name: string, params: Record<string, any>): Promise<SimpleToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        status: 'error',
        output: '',
        error: `Tool ${name} not found`
      };
    }

    // Check tool policy
    const policy = this.config.toolPolicy;
    if (policy?.requireApproval?.includes(name)) {
      // Would need approval (already handled in sendMessage)
    }

    try {
      const context: SimpleToolContext = {
        conversationHistory: this.conversation,
        metadata: {}
      };

      const result = await tool.execute(params, context);
      return result;
    } catch (error) {
      return {
        status: 'error',
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversation = [];
    
    if (this.config.conversationConfig?.includeSystem !== false) {
      this.conversation.push({
        role: 'system',
        content: this.systemPrompt,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get conversation history
   */
  getConversation(): ConversationMessage[] {
    return [...this.conversation];
  }

  /**
   * Update system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    
    // Update system message in conversation
    const systemIndex = this.conversation.findIndex(msg => msg.role === 'system');
    if (systemIndex >= 0) {
      this.conversation[systemIndex].content = prompt;
    } else if (this.config.conversationConfig?.includeSystem !== false) {
      this.conversation.unshift({
        role: 'system',
        content: prompt,
        timestamp: new Date()
      });
    }
  }

  /**
   * Manage conversation size based on configuration
   */
  private manageConversationSize(): void {
    const maxMessages = this.config.conversationConfig?.maxMessages || 50;
    const systemCount = this.conversation.filter(msg => msg.role === 'system').length;
    
    if (this.conversation.length > maxMessages + systemCount) {
      // Keep system messages and most recent messages
      const systemMessages = this.conversation.filter(msg => msg.role === 'system');
      const otherMessages = this.conversation.filter(msg => msg.role !== 'system');
      const keep = otherMessages.slice(-maxMessages);
      
      this.conversation = [...systemMessages, ...keep];
    }
  }

  /**
   * Export conversation to JSON
   */
  exportConversation(): string {
    return JSON.stringify(this.conversation, null, 2);
  }

  /**
   * Import conversation from JSON
   */
  importConversation(json: string): void {
    try {
      this.conversation = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid conversation JSON');
    }
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    toolsRegistered: number;
  } {
    return {
      messageCount: this.conversation.length,
      userMessages: this.conversation.filter(msg => msg.role === 'user').length,
      assistantMessages: this.conversation.filter(msg => msg.role === 'assistant').length,
      toolsRegistered: this.tools.size
    };
  }
}
