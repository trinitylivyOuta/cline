/**
 * API provider implementations
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  ApiProvider,
  ApiStreamChunk,
  Message,
  ModelInfo,
  ToolDefinition,
  ContentBlock,
  ToolUseBlock
} from '../core/types';

/**
 * Anthropic API provider
 */
export class AnthropicProvider implements ApiProvider {
  private client: Anthropic;
  private modelId: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022', baseUrl?: string) {
    this.client = new Anthropic({
      apiKey,
      baseURL: baseUrl
    });
    this.modelId = model;
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): AsyncIterable<ApiStreamChunk> {
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content.map(block => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text };
        } else if (block.type === 'image') {
          return {
            type: 'image' as const,
            source: block.source
          };
        } else if (block.type === 'tool_use') {
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input
          };
        } else if (block.type === 'tool_result') {
          return {
            type: 'tool_result' as const,
            tool_use_id: block.tool_use_id,
            content: typeof block.content === 'string' ? block.content : block.content,
            is_error: block.is_error
          };
        }
        throw new Error(`Unknown block type: ${(block as any).type}`);
      })
    }));

    // Convert tools to Anthropic format
    const anthropicTools = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    }));

    const stream = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 8096,
      system: systemPrompt,
      messages: anthropicMessages as any,
      tools: anthropicTools,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'message_start') {
        yield {
          type: 'message_start',
          message: { role: 'assistant' }
        };
      } else if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'text') {
          yield {
            type: 'content_block_start',
            content_block: { type: 'text', text: '' }
          };
        } else if (block.type === 'tool_use') {
          yield {
            type: 'content_block_start',
            content_block: {
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: {}
            }
          };
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          yield {
            type: 'content_block_delta',
            delta: { text: delta.text }
          };
        } else if (delta.type === 'input_json_delta') {
          // Tool input streaming
          yield {
            type: 'content_block_delta',
            delta: { text: delta.partial_json }
          };
        }
      } else if (event.type === 'content_block_stop') {
        yield { type: 'content_block_stop' };
      } else if (event.type === 'message_delta') {
        yield {
          type: 'message_delta',
          delta: { stop_reason: event.delta.stop_reason }
        };
      } else if (event.type === 'message_stop') {
        yield { type: 'message_stop' };
      }
    }
  }

  getModel(): ModelInfo {
    return {
      id: this.modelId,
      name: this.modelId,
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8096,
      supportsTools: true,
      supportsVision: true
    };
  }
}

/**
 * OpenAI API provider
 */
export class OpenAIProvider implements ApiProvider {
  private client: OpenAI;
  private modelId: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview', baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl
    });
    this.modelId = model;
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): AsyncIterable<ApiStreamChunk> {
    // Convert messages to OpenAI format
    const openaiMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of messages) {
      const content: any[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          content.push({ type: 'text', text: block.text });
        } else if (block.type === 'tool_use') {
          // OpenAI uses tool_calls in a different structure
          openaiMessages.push({
            role: 'assistant',
            tool_calls: [{
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input)
              }
            }]
          });
        } else if (block.type === 'tool_result') {
          openaiMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
          });
        }
      }

      if (content.length > 0) {
        openaiMessages.push({
          role: msg.role,
          content
        });
      }
    }

    // Convert tools to OpenAI format
    const openaiTools = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));

    const stream = await this.client.chat.completions.create({
      model: this.modelId,
      messages: openaiMessages,
      tools: openaiTools,
      stream: true
    });

    yield { type: 'message_start', message: { role: 'assistant' } };

    let currentToolCall: any = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        yield {
          type: 'content_block_delta',
          delta: { text: delta.content }
        };
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.function?.name) {
            currentToolCall = {
              id: toolCall.id || '',
              name: toolCall.function.name,
              arguments: ''
            };
            yield {
              type: 'content_block_start',
              content_block: {
                type: 'tool_use',
                id: currentToolCall.id,
                name: currentToolCall.name,
                input: {}
              }
            };
          }
          
          if (toolCall.function?.arguments) {
            currentToolCall.arguments += toolCall.function.arguments;
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        yield {
          type: 'message_delta',
          delta: { stop_reason: chunk.choices[0].finish_reason }
        };
      }
    }

    yield { type: 'message_stop' };
  }

  getModel(): ModelInfo {
    return {
      id: this.modelId,
      name: this.modelId,
      provider: 'openai',
      contextWindow: 128000,
      maxOutput: 4096,
      supportsTools: true,
      supportsVision: this.modelId.includes('vision') || this.modelId.includes('gpt-4')
    };
  }
}
