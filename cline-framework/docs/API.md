# Cline Framework API Reference

## Core Classes

### ClineAgent

The main agent class for executing tasks.

#### Constructor

```typescript
constructor(config: AgentConfig)
```

**Parameters:**
- `config`: Agent configuration object

#### Methods

##### `executeTask(task: string, options?: TaskOptions): Promise<TaskResult>`

Execute a task with the agent.

**Parameters:**
- `task`: The task description
- `options`: Optional task execution options
  - `images?: string[]`: Base64-encoded images to include
  - `files?: string[]`: File paths to include in context
  - `autoApprove?: boolean`: Auto-approve tool executions
  - `continueFromHistory?: boolean`: Continue from previous conversation

**Returns:** Promise resolving to task result

**Example:**
```typescript
const result = await agent.executeTask(
  'Create a Node.js server',
  { autoApprove: false }
);
```

##### `sendMessage(message: string, images?: string[]): Promise<void>`

Send a message in an ongoing conversation.

##### `abort(): void`

Abort the current task execution.

##### `getState(): AgentState`

Get the current agent state.

#### Events

The agent extends EventEmitter and emits the following events:

- `state_change`: Emitted when agent state changes
- `message`: Emitted for each message in conversation
- `tool_use`: Emitted when a tool is requested
- `tool_result`: Emitted after tool execution
- `complete`: Emitted when task completes
- `error`: Emitted on error

**Example:**
```typescript
agent.on('tool_use', (tool) => {
  console.log(`Tool: ${tool.name}`);
});
```

## Built-in Tools

The framework includes several built-in tools that are available by default:

- **write_to_file** - Write content to a file
- **read_file** - Read file contents  
- **list_files** - List files in a directory
- **execute_command** - Execute shell commands
- **ask_followup_question** - Ask the user a question
- **attempt_completion** - Signal task completion

See [CUSTOM_TOOLS.md](./CUSTOM_TOOLS.md) for details on creating custom tools.

## Host Adapters

### TerminalHost

Host adapter for terminal/CLI applications.

```typescript
import { TerminalHost } from '@cline/framework/host';

const host = new TerminalHost({
  cwd: process.cwd()
});
```

### MockHost

Host adapter for testing.

```typescript
import { MockHost } from '@cline/framework/host';

const host = new MockHost({
  cwd: '/test',
  files: {
    'test.txt': 'content'
  }
});
```

## Complete Example

```typescript
import { ClineAgent, getDefaultTools } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost(),
  maxIterations: 10,
  
  onToolUse: async (tool) => {
    console.log(`Tool: ${tool.name}`);
    return true; // Approve
  },
  
  onComplete: (result) => {
    console.log(`Completed: ${result.status}`);
  }
});

const result = await agent.executeTask(
  'Create a simple Node.js HTTP server'
);

console.log(result);
```

For more details, see the full [API documentation](./API.md).
