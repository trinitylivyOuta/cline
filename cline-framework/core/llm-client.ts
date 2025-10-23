/**
 * Layer 1: Raw LLM Client - Direct API access with minimal abstraction
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Configuration for LLM client
 */
export interface LLMClientConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  
  // Advanced options
  defaultParams?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
  };
  
  retryConfig?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    initialDelay?: number;
  };
  
  // Custom transformers
  requestTransformer?: (req: any) => any;
  responseTransformer?: (res: any) => any;
}

/**
 * Completion request parameters
 */
export interface CompletionRequest {
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<any>;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

/**
 * Stream chunk types
 */
export type StreamChunk =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'done'; stop_reason: string }
  | { type: 'error'; error: Error }
  | { type: 'usage'; input_tokens: number; output_tokens: number };

/**
 * Raw LLM Client - Layer 1
 * 
 * Provides direct access to LLM APIs with minimal abstraction.
 * Use this when you need complete control over API calls.
 */
export class LLMClient {
  private config: LLMClientConfig;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;

  constructor(config: LLMClientConfig) {
    this.config = config;
    
    if (config.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    } else if (config.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    }
  }

  /**
   * Stream a completion from the LLM
   */
  async *streamCompletion(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const params = this.applyDefaultParams(request);
    
    // Apply request transformer if provided
    const transformedRequest = this.config.requestTransformer
      ? this.config.requestTransformer(params)
      : params;

    if (this.config.provider === 'anthropic') {
      yield* this.streamAnthropicCompletion(transformedRequest);
    } else if (this.config.provider === 'openai') {
      yield* this.streamOpenAICompletion(transformedRequest);
    } else {
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Get a single completion (non-streaming)
   */
  async getCompletion(request: CompletionRequest): Promise<{
    text: string;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    let text = '';
    let usage = { input_tokens: 0, output_tokens: 0 };

    for await (const chunk of this.streamCompletion(request)) {
      if (chunk.type === 'text_delta') {
        text += chunk.text;
      } else if (chunk.type === 'usage') {
        usage = {
          input_tokens: chunk.input_tokens,
          output_tokens: chunk.output_tokens
        };
      } else if (chunk.type === 'error') {
        throw chunk.error;
      }
    }

    return { text, usage };
  }

  /**
   * Stream from Anthropic API
   */
  private async *streamAnthropicCompletion(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const stream = await this.anthropicClient.messages.create({
        model: this.config.model,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p,
        top_k: request.top_k,
        system: request.system,
        messages: request.messages as any,
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if ('text' in event.delta && event.delta.text) {
            yield { type: 'text_delta', text: event.delta.text };
          }
        } else if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            yield {
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input
            };
          }
        } else if (event.type === 'message_delta') {
          if (event.delta.stop_reason) {
            yield { type: 'done', stop_reason: event.delta.stop_reason };
          }
        } else if (event.type === 'message_start') {
          if (event.message.usage) {
            yield {
              type: 'usage',
              input_tokens: event.message.usage.input_tokens,
              output_tokens: event.message.usage.output_tokens
            };
          }
        }
      }
    } catch (error) {
      yield { type: 'error', error: error as Error };
    }
  }

  /**
   * Stream from OpenAI API
   */
  private async *streamOpenAICompletion(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const messages: any[] = [];
      
      if (request.system) {
        messages.push({ role: 'system', content: request.system });
      }
      
      messages.push(...request.messages);

      const stream = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop_sequences,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield { type: 'text_delta', text: delta.content };
        }
        
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function) {
              yield {
                type: 'tool_use',
                id: toolCall.id || '',
                name: toolCall.function.name || '',
                input: JSON.parse(toolCall.function.arguments || '{}')
              };
            }
          }
        }
        
        if (chunk.choices[0]?.finish_reason) {
          yield { type: 'done', stop_reason: chunk.choices[0].finish_reason };
        }
      }
    } catch (error) {
      yield { type: 'error', error: error as Error };
    }
  }

  /**
   * Apply default parameters to request
   */
  private applyDefaultParams(request: CompletionRequest): CompletionRequest {
    const defaults = this.config.defaultParams || {};
    
    return {
      ...request,
      temperature: request.temperature ?? defaults.temperature ?? 0.7,
      top_p: request.top_p ?? defaults.top_p,
      top_k: request.top_k ?? defaults.top_k,
      max_tokens: request.max_tokens ?? defaults.max_tokens ?? 4096
    };
  }

  /**
   * Get model information
   */
  getModelInfo(): { provider: string; model: string } {
    return {
      provider: this.config.provider,
      model: this.config.model
    };
  }
}
