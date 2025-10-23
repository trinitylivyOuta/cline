/**
 * Core types for the Cline Framework
 */

/**
 * Message role in the conversation
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Content block types
 */
export type ContentBlockType = 'text' | 'image' | 'tool_use' | 'tool_result';

/**
 * Text content block
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

/**
 * Image content block
 */
export interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: string;
    data: string;
  };
}

/**
 * Tool use block (LLM requesting to use a tool)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool result block (result of tool execution)
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

/**
 * Union type for all content blocks
 */
export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

/**
 * Message in the conversation
 */
export interface Message {
  role: MessageRole;
  content: Array<ContentBlock>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  // API configuration
  apiProvider: 'anthropic' | 'openai' | 'openrouter' | string;
  apiKey: string;
  model: string;
  apiBaseUrl?: string;
  
  // Host adapter
  host: HostAdapter;
  
  // Optional configurations
  systemPrompt?: string;
  tools?: ToolHandler[];
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  
  // Callbacks
  onMessage?: (message: Message) => void;
  onToolUse?: (tool: ToolUseBlock) => Promise<boolean>; // Return false to reject
  onComplete?: (result: TaskResult) => void;
}

/**
 * Task execution options
 */
export interface TaskOptions {
  images?: string[]; // Base64 encoded images
  files?: string[]; // File paths to include
  autoApprove?: boolean; // Auto-approve tool uses
  continueFromHistory?: boolean;
}

/**
 * Task execution result
 */
export interface TaskResult {
  status: 'completed' | 'rejected' | 'error' | 'cancelled';
  message: string;
  output?: string;
  error?: Error;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  toolsExecuted?: number;
  iterations?: number;
}

/**
 * Tool handler interface
 */
export interface ToolHandler {
  name: string;
  description: string;
  parameters?: ToolParameterSchema;
  
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

/**
 * Tool parameter schema (JSON Schema format)
 */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  host: HostAdapter;
  workingDirectory: string;
  conversation: Message[];
  taskId: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  status: 'success' | 'error';
  output: string;
  error?: string;
}

/**
 * Host adapter interface - abstracts environment-specific operations
 */
export interface HostAdapter {
  // Display messages to the user
  showMessage(message: string, type: MessageType): Promise<void>;
  
  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listFiles(directory: string, pattern?: string): Promise<string[]>;
  
  // Command execution
  executeCommand(command: string, workingDir?: string): Promise<CommandResult>;
  
  // Directory operations
  getCurrentDirectory(): string;
  setCurrentDirectory(path: string): void;
  
  // User interaction
  askUser(question: string, options?: AskOptions): Promise<string>;
  
  // Optional: Browser operations (if supported)
  openUrl?(url: string): Promise<void>;
  
  // Optional: Advanced features
  getDiff?(original: string, modified: string): Promise<string>;
}

/**
 * Message types for user display
 */
export type MessageType = 'info' | 'warning' | 'error' | 'success';

/**
 * Command execution result
 */
export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  signal?: string;
}

/**
 * Options for asking user questions
 */
export interface AskOptions {
  defaultValue?: string;
  choices?: string[];
  multiline?: boolean;
}

/**
 * API provider interface - abstracts different LLM providers
 */
export interface ApiProvider {
  createMessage(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): AsyncIterable<ApiStreamChunk>;
  
  getModel(): ModelInfo;
}

/**
 * Tool definition for API
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameterSchema;
}

/**
 * API streaming chunk
 */
export type ApiStreamChunk = 
  | { type: 'content_block_start'; content_block: ContentBlock }
  | { type: 'content_block_delta'; delta: { text?: string } }
  | { type: 'content_block_stop' }
  | { type: 'message_start'; message: { role: string } }
  | { type: 'message_delta'; delta: { stop_reason?: string | null } }
  | { type: 'message_stop' }
  | { type: 'usage'; usage: { input_tokens: number; output_tokens: number } };

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput?: number;
  supportsTools: boolean;
  supportsVision: boolean;
}

/**
 * Agent state
 */
export interface AgentState {
  taskId: string;
  status: 'idle' | 'thinking' | 'executing_tool' | 'waiting_for_user' | 'completed' | 'error';
  messages: Message[];
  currentIteration: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Agent events
 */
export interface AgentEvents {
  'state_change': (state: AgentState) => void;
  'message': (message: Message) => void;
  'tool_use': (tool: ToolUseBlock) => void;
  'tool_result': (result: ToolResult) => void;
  'complete': (result: TaskResult) => void;
  'error': (error: Error) => void;
}
