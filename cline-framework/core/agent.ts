/**
 * Main Cline Agent implementation
 */

import { EventEmitter } from 'events';
import {
  AgentConfig,
  AgentState,
  AgentEvents,
  TaskOptions,
  TaskResult,
  Message,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ToolContext,
  ApiProvider,
  ToolDefinition,
  ApiStreamChunk
} from './types';
import { AnthropicProvider, OpenAIProvider } from './providers';
import { getDefaultTools } from './tools';

/**
 * Main agent class for executing tasks
 */
export class ClineAgent extends EventEmitter {
  private config: AgentConfig;
  private provider: ApiProvider;
  private state: AgentState;
  private aborted: boolean = false;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    
    // Initialize API provider
    this.provider = this.createProvider(config);
    
    // Initialize state
    this.state = {
      taskId: this.generateTaskId(),
      status: 'idle',
      messages: [],
      currentIteration: 0,
      tokensUsed: {
        input: 0,
        output: 0
      }
    };
  }

  /**
   * Execute a task
   */
  async executeTask(task: string, options: TaskOptions = {}): Promise<TaskResult> {
    this.aborted = false;
    this.state.taskId = this.generateTaskId();
    this.state.status = 'thinking';
    this.state.messages = [];
    this.state.currentIteration = 0;
    this.emitStateChange();

    try {
      // Add initial user message
      const userMessage: Message = {
        role: 'user',
        content: [{ type: 'text', text: task }]
      };

      // Add images if provided
      if (options.images) {
        for (const imageData of options.images) {
          userMessage.content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageData
            }
          });
        }
      }

      this.state.messages.push(userMessage);
      this.emit('message', userMessage);

      // Get tools
      const tools = this.config.tools || getDefaultTools();
      const toolDefinitions: ToolDefinition[] = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters || { type: 'object', properties: {} }
      }));

      // Main execution loop
      const maxIterations = this.config.maxIterations || 25;
      let completed = false;

      while (!completed && !this.aborted && this.state.currentIteration < maxIterations) {
        this.state.currentIteration++;
        this.state.status = 'thinking';
        this.emitStateChange();

        // Get system prompt
        const systemPrompt = this.config.systemPrompt || this.getDefaultSystemPrompt(tools);

        // Create API message
        const assistantMessage = await this.createAssistantMessage(
          systemPrompt,
          this.state.messages,
          toolDefinitions
        );

        this.state.messages.push(assistantMessage);
        this.emit('message', assistantMessage);

        // Check for tool uses
        const toolUses = assistantMessage.content.filter(
          block => block.type === 'tool_use'
        ) as ToolUseBlock[];

        if (toolUses.length === 0) {
          // No tools to execute, task might be complete
          completed = true;
          break;
        }

        // Execute tools
        this.state.status = 'executing_tool';
        this.emitStateChange();

        const toolResults: ToolResultBlock[] = [];

        for (const toolUse of toolUses) {
          this.emit('tool_use', toolUse);

          // Check for approval if needed
          if (!options.autoApprove && this.config.onToolUse) {
            const approved = await this.config.onToolUse(toolUse);
            if (!approved) {
              return {
                status: 'rejected',
                message: 'Tool use rejected by user',
                iterations: this.state.currentIteration
              };
            }
          }

          // Check for completion tool
          if (toolUse.name === 'attempt_completion') {
            const result: ToolResultBlock = {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: 'Task completed successfully'
            };
            toolResults.push(result);
            completed = true;
            continue;
          }

          // Execute tool
          const tool = tools.find(t => t.name === toolUse.name);
          if (!tool) {
            const errorResult: ToolResultBlock = {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Tool not found: ${toolUse.name}`,
              is_error: true
            };
            toolResults.push(errorResult);
            continue;
          }

          try {
            const context: ToolContext = {
              host: this.config.host,
              workingDirectory: this.config.host.getCurrentDirectory(),
              conversation: this.state.messages,
              taskId: this.state.taskId
            };

            const result = await tool.execute(toolUse.input, context);
            this.emit('tool_result', result);

            const toolResult: ToolResultBlock = {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.error ? `Error: ${result.error}\n${result.output}` : result.output,
              is_error: result.status === 'error'
            };
            toolResults.push(toolResult);
          } catch (error: any) {
            const errorResult: ToolResultBlock = {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Tool execution error: ${error.message}`,
              is_error: true
            };
            toolResults.push(errorResult);
          }
        }

        // Add tool results as user message
        if (toolResults.length > 0) {
          const toolResultMessage: Message = {
            role: 'user',
            content: toolResults
          };
          this.state.messages.push(toolResultMessage);
          this.emit('message', toolResultMessage);
        }
      }

      this.state.status = 'completed';
      this.emitStateChange();

      const result: TaskResult = {
        status: this.aborted ? 'cancelled' : 'completed',
        message: completed ? 'Task completed successfully' : 'Max iterations reached',
        tokensUsed: {
          input: this.state.tokensUsed.input,
          output: this.state.tokensUsed.output,
          total: this.state.tokensUsed.input + this.state.tokensUsed.output
        },
        iterations: this.state.currentIteration
      };

      this.emit('complete', result);
      if (this.config.onComplete) {
        this.config.onComplete(result);
      }

      return result;
    } catch (error: any) {
      this.state.status = 'error';
      this.emitStateChange();

      const result: TaskResult = {
        status: 'error',
        message: error.message,
        error,
        iterations: this.state.currentIteration
      };

      this.emit('error', error);
      return result;
    }
  }

  /**
   * Send a message in an ongoing conversation
   */
  async sendMessage(message: string, images?: string[]): Promise<void> {
    const userMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text: message }]
    };

    if (images) {
      for (const imageData of images) {
        userMessage.content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        });
      }
    }

    this.state.messages.push(userMessage);
    this.emit('message', userMessage);
  }

  /**
   * Abort the current task
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Create assistant message from API
   */
  private async createAssistantMessage(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): Promise<Message> {
    const content: ContentBlock[] = [];
    let currentTextBlock: TextBlock | null = null;
    let currentToolUse: Partial<ToolUseBlock> | null = null;
    let toolInputJson = '';

    const stream = this.provider.createMessage(systemPrompt, messages, tools);

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'text') {
          currentTextBlock = { type: 'text', text: '' };
        } else if (chunk.content_block.type === 'tool_use') {
          currentToolUse = {
            type: 'tool_use',
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            input: {}
          };
          toolInputJson = '';
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.text) {
          if (currentTextBlock) {
            currentTextBlock.text += chunk.delta.text;
          } else if (currentToolUse) {
            toolInputJson += chunk.delta.text;
          }
        }
      } else if (chunk.type === 'content_block_stop') {
        if (currentTextBlock) {
          content.push(currentTextBlock);
          currentTextBlock = null;
        } else if (currentToolUse) {
          try {
            currentToolUse.input = JSON.parse(toolInputJson);
          } catch {
            currentToolUse.input = {};
          }
          content.push(currentToolUse as ToolUseBlock);
          currentToolUse = null;
        }
      } else if (chunk.type === 'usage') {
        this.state.tokensUsed.input += chunk.usage.input_tokens;
        this.state.tokensUsed.output += chunk.usage.output_tokens;
      }
    }

    return {
      role: 'assistant',
      content
    };
  }

  /**
   * Create API provider based on config
   */
  private createProvider(config: AgentConfig): ApiProvider {
    switch (config.apiProvider) {
      case 'anthropic':
        return new AnthropicProvider(config.apiKey, config.model, config.apiBaseUrl);
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.model, config.apiBaseUrl);
      default:
        throw new Error(`Unsupported API provider: ${config.apiProvider}`);
    }
  }

  /**
   * Generate default system prompt
   */
  private getDefaultSystemPrompt(tools: any[]): string {
    return `You are Cline, an AI assistant that can help with various tasks using the tools provided.

You have access to the following tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When given a task:
1. Break it down into steps
2. Use the appropriate tools to accomplish each step
3. When complete, use the attempt_completion tool with a summary

Always be concise and focused on completing the task efficiently.`;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit state change event
   */
  private emitStateChange(): void {
    this.emit('state_change', this.state);
  }
}
