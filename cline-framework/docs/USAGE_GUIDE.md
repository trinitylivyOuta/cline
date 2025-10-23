# Cline Framework - Complete Usage Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Basic Usage](#basic-usage)
4. [Advanced Usage](#advanced-usage)
5. [Configuration](#configuration)
6. [Working with Tools](#working-with-tools)
7. [Host Adapters](#host-adapters)
8. [API Providers](#api-providers)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Examples](#examples)

---

## Getting Started

### Installation

```bash
# Using npm
npm install @cline/framework

# Using yarn
yarn add @cline/framework

# Using pnpm
pnpm add @cline/framework
```

### Prerequisites

- Node.js 18.0.0 or higher
- An API key from Anthropic, OpenAI, or another supported provider
- TypeScript 5.4.5+ (if using TypeScript)

### Quick Start

Create a simple agent in 5 minutes:

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

// 1. Create a host adapter
const host = new TerminalHost({ 
  cwd: process.cwd() 
});

// 2. Create the agent
const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  host
});

// 3. Execute a task
const result = await agent.executeTask(
  'Create a hello.txt file with a greeting message'
);

console.log('Status:', result.status);
console.log('Iterations:', result.iterations);
```

---

## Core Concepts

### The Agent

The `ClineAgent` is the core class that orchestrates task execution. It:
- Manages conversation with the LLM
- Coordinates tool execution
- Handles state transitions
- Emits events for monitoring

### Host Adapters

Host adapters abstract environment-specific operations:
- **TerminalHost**: For CLI applications
- **MockHost**: For testing
- **Custom**: Implement your own for specific environments

### Tools

Tools are capabilities the agent can use:
- File operations (read, write, list)
- Command execution
- User interaction
- Custom tools you define

### API Providers

Providers abstract different LLM APIs:
- Anthropic Claude
- OpenAI GPT
- Extensible for more

---

## Basic Usage

### Creating an Agent

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  // Required
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost(),
  
  // Optional
  maxIterations: 25,           // Maximum conversation turns
  temperature: 0.7,             // LLM temperature (not yet implemented)
  systemPrompt: 'Custom prompt', // Override default prompt
  
  // Callbacks
  onMessage: (msg) => {
    console.log('Message:', msg.role);
  },
  
  onToolUse: async (tool) => {
    console.log('Tool requested:', tool.name);
    return true; // Approve or reject
  },
  
  onComplete: (result) => {
    console.log('Task complete:', result.status);
  }
});
```

### Executing Tasks

```typescript
// Simple task
const result = await agent.executeTask(
  'List all JavaScript files in the current directory'
);

// Task with images
const result = await agent.executeTask(
  'Analyze this screenshot and describe the UI',
  {
    images: [base64EncodedImage],
    autoApprove: false
  }
);

// Task with auto-approval
const result = await agent.executeTask(
  'Create package.json',
  { autoApprove: true }
);
```

### Understanding Results

```typescript
interface TaskResult {
  status: 'completed' | 'rejected' | 'error' | 'cancelled';
  message: string;
  output?: string;
  error?: Error;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  iterations?: number;
}
```

---

## Advanced Usage

### Event Monitoring

```typescript
// Listen to all events
agent.on('state_change', (state) => {
  console.log('State:', state.status);
  console.log('Iteration:', state.currentIteration);
  console.log('Tokens used:', state.tokensUsed);
});

agent.on('message', (message) => {
  // Log all messages in conversation
  console.log(message.role, ':', message.content);
});

agent.on('tool_use', (tool) => {
  console.log('Tool:', tool.name);
  console.log('Input:', tool.input);
});

agent.on('tool_result', (result) => {
  console.log('Result:', result.status);
  console.log('Output:', result.output);
});

agent.on('error', (error) => {
  console.error('Error:', error.message);
});
```

### Interactive Tasks

```typescript
// Allow the agent to ask questions
agent.on('tool_use', async (tool) => {
  if (tool.name === 'ask_followup_question') {
    // Agent is asking a question
    console.log('Agent asks:', tool.input.question);
  }
  return true;
});

await agent.executeTask('Help me set up a new project');
```

### Multi-Step Tasks

```typescript
// Start a task
const agent = new ClineAgent({ /* config */ });

// Execute first task
await agent.executeTask('Create a React component');

// Continue with related task
await agent.sendMessage('Now add TypeScript types');

// Agent maintains context across messages
```

### Aborting Tasks

```typescript
const agent = new ClineAgent({ /* config */ });

// Start a long-running task
const promise = agent.executeTask('Complex task...');

// Abort after 30 seconds
setTimeout(() => {
  agent.abort();
}, 30000);

const result = await promise;
console.log(result.status); // 'cancelled'
```

---

## Configuration

### API Provider Options

#### Anthropic

```typescript
{
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  apiBaseUrl: 'https://api.anthropic.com' // Optional
}
```

Available models:
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

#### OpenAI

```typescript
{
  apiProvider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  apiBaseUrl: 'https://api.openai.com/v1' // Optional
}
```

Available models:
- `gpt-4-turbo-preview`
- `gpt-4`
- `gpt-3.5-turbo`

### Host Configuration

#### TerminalHost

```typescript
import { TerminalHost } from '@cline/framework/host';

const host = new TerminalHost({
  cwd: '/path/to/working/directory'
});

// Change directory
host.setCurrentDirectory('/new/path');

// Get current directory
const cwd = host.getCurrentDirectory();
```

#### MockHost

```typescript
import { MockHost } from '@cline/framework/host';

const host = new MockHost({
  cwd: '/virtual/path',
  files: {
    '/virtual/path/test.txt': 'Initial content'
  }
});

// After task execution, inspect what happened
const messages = host.getMessages();
const commands = host.getCommands();
const files = host.getFiles();
```

---

## Working with Tools

### Using Built-in Tools

The framework includes 6 built-in tools:

1. **write_to_file** - Create or overwrite files
2. **read_file** - Read file contents
3. **list_files** - List files in a directory
4. **execute_command** - Run shell commands
5. **ask_followup_question** - Ask the user
6. **attempt_completion** - Signal task completion

These are automatically available to the agent.

### Creating Custom Tools

```typescript
import { ToolHandler, ToolContext, ToolResult } from '@cline/framework';

class DatabaseQueryTool implements ToolHandler {
  name = 'query_database';
  description = 'Query the database and return results';
  
  parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL query to execute'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results'
      }
    },
    required: ['query']
  };
  
  async execute(
    params: { query: string; limit?: number },
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // Your database logic here
      const results = await db.query(params.query, params.limit);
      
      return {
        status: 'success',
        output: JSON.stringify(results, null, 2)
      };
    } catch (error: any) {
      return {
        status: 'error',
        output: '',
        error: error.message
      };
    }
  }
}

// Register with agent
import { getDefaultTools } from '@cline/framework';

const agent = new ClineAgent({
  // ... config
  tools: [
    ...getDefaultTools(),
    new DatabaseQueryTool()
  ]
});
```

### Tool Context

Tools receive a context object:

```typescript
interface ToolContext {
  host: HostAdapter;           // Access to file system, commands
  workingDirectory: string;     // Current working directory
  conversation: Message[];      // Full conversation history
  taskId: string;              // Unique task identifier
}
```

Use this context to:
- Read/write files via `context.host`
- Access conversation history
- Track the current task

---

## Host Adapters

### Implementing a Custom Host

```typescript
import { HostAdapter, MessageType, CommandResult } from '@cline/framework';

class MyCustomHost implements HostAdapter {
  private cwd: string;
  
  constructor(cwd: string) {
    this.cwd = cwd;
  }
  
  async showMessage(message: string, type: MessageType): Promise<void> {
    // Display message to user
    console.log(`[${type.toUpperCase()}]`, message);
  }
  
  async readFile(path: string): Promise<string> {
    // Read file from your storage
    return await myStorage.read(path);
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    // Write file to your storage
    await myStorage.write(path, content);
  }
  
  async fileExists(path: string): Promise<boolean> {
    return await myStorage.exists(path);
  }
  
  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    const files = await myStorage.list(directory);
    if (pattern) {
      const regex = new RegExp(pattern);
      return files.filter(f => regex.test(f));
    }
    return files;
  }
  
  async executeCommand(
    command: string,
    workingDir?: string
  ): Promise<CommandResult> {
    // Execute command in your environment
    const result = await myExecutor.run(command, workingDir || this.cwd);
    return {
      exitCode: result.code,
      stdout: result.output,
      stderr: result.error
    };
  }
  
  getCurrentDirectory(): string {
    return this.cwd;
  }
  
  setCurrentDirectory(path: string): void {
    this.cwd = path;
  }
  
  async askUser(question: string, options?: AskOptions): Promise<string> {
    // Get input from user
    return await myUI.prompt(question, options);
  }
}

// Use your custom host
const agent = new ClineAgent({
  // ... config
  host: new MyCustomHost('/app/workspace')
});
```

---

## API Providers

### Creating a Custom Provider

```typescript
import { ApiProvider, ApiStreamChunk, Message, ToolDefinition, ModelInfo } from '@cline/framework';

class CustomAPIProvider implements ApiProvider {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async *createMessage(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDefinition[]
  ): AsyncIterable<ApiStreamChunk> {
    // Make API call to your LLM service
    const response = await fetch('https://your-api.com/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools,
        system: systemPrompt,
        stream: true
      })
    });
    
    // Stream the response
    for await (const chunk of response.body) {
      // Parse and yield chunks
      yield {
        type: 'content_block_delta',
        delta: { text: chunk.text }
      };
    }
    
    yield { type: 'message_stop' };
  }
  
  getModel(): ModelInfo {
    return {
      id: this.model,
      name: this.model,
      provider: 'custom',
      contextWindow: 100000,
      maxOutput: 4096,
      supportsTools: true,
      supportsVision: false
    };
  }
}
```

---

## Error Handling

### Handling Task Errors

```typescript
try {
  const result = await agent.executeTask('Complex task');
  
  if (result.status === 'error') {
    console.error('Task failed:', result.message);
    console.error('Error:', result.error);
  } else if (result.status === 'completed') {
    console.log('Success:', result.message);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### Handling Tool Errors

```typescript
class SafeTool implements ToolHandler {
  name = 'safe_tool';
  description = 'A tool with error handling';
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      // Validate inputs
      if (!params.requiredField) {
        throw new Error('requiredField is missing');
      }
      
      // Perform operation
      const result = await doSomething(params);
      
      return {
        status: 'success',
        output: result
      };
    } catch (error: any) {
      // Log for debugging
      console.error('Tool error:', error);
      
      // Return user-friendly error
      return {
        status: 'error',
        output: '',
        error: `Failed to execute: ${error.message}`
      };
    }
  }
}
```

### Event-based Error Handling

```typescript
agent.on('error', (error) => {
  // Log errors
  console.error('Agent error:', error.message);
  console.error('Stack:', error.stack);
  
  // Send to monitoring service
  monitoring.captureError(error);
});
```

---

## Best Practices

### 1. API Key Management

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required');
}

// ❌ Bad: Hardcoded keys
const apiKey = 'sk-ant-...'; // Never do this!
```

### 2. Tool Approval

```typescript
// ✅ Good: Review critical operations
const agent = new ClineAgent({
  // ... config
  onToolUse: async (tool) => {
    if (tool.name === 'execute_command') {
      // Review commands before execution
      console.log('Command:', tool.input.command);
      return await askUserForApproval();
    }
    return true; // Auto-approve safe tools
  }
});

// ❌ Bad: Auto-approve everything
const agent = new ClineAgent({
  // ... config
});
await agent.executeTask('...', { autoApprove: true });
```

### 3. Error Handling

```typescript
// ✅ Good: Handle all error cases
try {
  const result = await agent.executeTask(task);
  if (result.status === 'error') {
    // Handle error
  } else if (result.status === 'completed') {
    // Handle success
  }
} catch (error) {
  // Handle unexpected errors
}

// ❌ Bad: Assume success
const result = await agent.executeTask(task);
console.log(result.output); // May be undefined!
```

### 4. Resource Cleanup

```typescript
// ✅ Good: Cleanup resources
const host = new TerminalHost();
const agent = new ClineAgent({ host, /* ... */ });

try {
  await agent.executeTask(task);
} finally {
  host.dispose(); // Cleanup
}

// ❌ Bad: No cleanup
// May leave file handles or processes open
```

### 5. Iteration Limits

```typescript
// ✅ Good: Set reasonable limits
const agent = new ClineAgent({
  // ... config
  maxIterations: 25 // Prevent infinite loops
});

// ❌ Bad: No limits
const agent = new ClineAgent({
  // ... config
  maxIterations: 1000 // May run forever
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module"

```bash
# Solution: Ensure you've built the project
cd cline-framework
npm run build
```

#### 2. "Type definition file for 'node' not found"

```bash
# Solution: Install dev dependencies
npm install --save-dev @types/node
```

#### 3. "API key not found"

```typescript
// Solution: Check environment variable
console.log('API Key:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set');

// Or pass directly (not recommended for production)
const agent = new ClineAgent({
  apiKey: 'your-key-here',
  // ...
});
```

#### 4. "Agent stuck in loop"

```typescript
// Solution: Set max iterations
const agent = new ClineAgent({
  maxIterations: 10, // Stop after 10 turns
  // ...
});

// Or abort manually
setTimeout(() => agent.abort(), 60000);
```

#### 5. "Tool execution fails"

```typescript
// Debug by logging tool use
agent.on('tool_use', (tool) => {
  console.log('Tool:', tool.name);
  console.log('Input:', JSON.stringify(tool.input, null, 2));
});

agent.on('tool_result', (result) => {
  console.log('Status:', result.status);
  console.log('Output:', result.output);
  if (result.error) {
    console.error('Error:', result.error);
  }
});
```

### Debug Mode

Enable verbose logging:

```typescript
// Log all events
const agent = new ClineAgent({
  // ... config
  onMessage: (msg) => console.log('[MSG]', msg),
  onToolUse: (tool) => console.log('[TOOL]', tool),
});

agent.on('state_change', (state) => {
  console.log('[STATE]', state.status, `(iter ${state.currentIteration})`);
});
```

### Performance Issues

```typescript
// Monitor token usage
agent.on('state_change', (state) => {
  console.log('Tokens:', state.tokensUsed);
  
  // Warn if approaching limits
  if (state.tokensUsed.total > 50000) {
    console.warn('High token usage!');
  }
});

// Set timeouts
const timeoutMs = 5 * 60 * 1000; // 5 minutes
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), timeoutMs)
);

const result = await Promise.race([
  agent.executeTask(task),
  timeoutPromise
]);
```

---

## Examples

### Example 1: Code Generator

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

async function generateCode(description: string) {
  const host = new TerminalHost({ cwd: './output' });
  
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    host
  });
  
  const result = await agent.executeTask(
    `Create a ${description} with proper error handling and tests`
  );
  
  return result;
}

// Usage
await generateCode('REST API client for GitHub');
```

### Example 2: File Analyzer

```typescript
async function analyzeFiles(directory: string) {
  const host = new TerminalHost({ cwd: directory });
  
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    host,
    
    onToolUse: async (tool) => {
      // Only allow read operations
      const readOnlyTools = ['read_file', 'list_files'];
      return readOnlyTools.includes(tool.name);
    }
  });
  
  const result = await agent.executeTask(
    'Analyze all TypeScript files and create a summary report in REPORT.md'
  );
  
  return result;
}
```

### Example 3: Interactive Assistant

```typescript
import * as readline from 'readline';

async function interactiveAssistant() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    host: new TerminalHost()
  });
  
  console.log('Interactive Assistant (type "exit" to quit)');
  
  while (true) {
    const task = await new Promise<string>(resolve =>
      rl.question('\nYou: ', resolve)
    );
    
    if (task.toLowerCase() === 'exit') break;
    
    const result = await agent.executeTask(task);
    console.log('\nAssistant:', result.message);
  }
  
  rl.close();
}

interactiveAssistant();
```

### Example 4: Batch Processing

```typescript
async function batchProcess(tasks: string[]) {
  const results = [];
  
  for (const task of tasks) {
    const agent = new ClineAgent({
      apiProvider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-5-sonnet-20241022',
      host: new TerminalHost()
    });
    
    try {
      const result = await agent.executeTask(task);
      results.push({ task, result });
    } catch (error) {
      results.push({ task, error });
    }
  }
  
  return results;
}

// Process multiple tasks
const tasks = [
  'Create README.md',
  'Create .gitignore for Node.js',
  'Create LICENSE file (MIT)'
];

const results = await batchProcess(tasks);
```

---

## Next Steps

- Read the [API Reference](./API.md) for detailed API documentation
- Learn about [Creating Custom Tools](./CUSTOM_TOOLS.md)
- Review the [Architecture Guide](../ARCHITECTURE.md)
- Check out the [demo applications](../demo/)
- Join the community (if available)

---

For issues or questions, see the [main README](../README.md) or open an issue on GitHub.
