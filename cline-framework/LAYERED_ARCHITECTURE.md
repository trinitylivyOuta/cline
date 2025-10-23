# Cline Framework - Layered Architecture Design

## Overview

The Cline Framework now supports customization at multiple abstraction layers, allowing developers to use exactly what they need - from raw LLM API calls to full multi-agent orchestration.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Multi-Agent Orchestration                        │
│  - Agent coordination, workflows, distributed systems       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Agentic Loop (ClineAgent)                        │
│  - Full autonomous agent with tool execution loop           │
│  - Iterative reasoning and action                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: LLM Application (SimpleLLM)                       │
│  - Single request-response pattern                          │
│  - Tool calling without iteration                           │
│  - Conversation management                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Raw API Wrapper (LLMClient)                       │
│  - Direct LLM provider API calls                            │
│  - Streaming support                                        │
│  - Minimal abstraction                                      │
└─────────────────────────────────────────────────────────────┘
```

## Layer Details

### Layer 1: Raw API Wrapper (LLMClient)

**Purpose**: Direct access to LLM APIs with minimal abstraction.

**Use Cases**:
- Custom integrations
- Performance-critical applications
- Full control over API parameters
- Building your own frameworks

**Features**:
- Direct API calls to Anthropic, OpenAI, etc.
- Streaming support
- No opinions on message format
- Complete parameter control

**Example**:
```typescript
import { LLMClient } from '@cline/framework/llm';

const client = new LLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// Direct streaming call
for await (const chunk of client.streamCompletion({
  system: 'You are a helpful assistant',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 1024,
  temperature: 0.7
})) {
  if (chunk.type === 'text_delta') {
    process.stdout.write(chunk.text);
  }
}
```

### Layer 2: LLM Application (SimpleLLM)

**Purpose**: Single request-response pattern with conversation management.

**Use Cases**:
- Chatbots without autonomy
- Q&A systems
- Single-turn tool calling
- Assistants without loops

**Features**:
- Conversation history management
- Tool calling (single turn)
- System prompt templating
- Response parsing

**Example**:
```typescript
import { SimpleLLM } from '@cline/framework/app';

const app = new SimpleLLM({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: 'You are a code review assistant.'
});

// Add tools
app.addTool({
  name: 'analyze_code',
  description: 'Analyze code for issues',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      language: { type: 'string' }
    },
    required: ['code']
  },
  execute: async (params) => {
    // Your analysis logic
    return { status: 'success', output: 'Analysis complete' };
  }
});

// Single request-response
const response = await app.sendMessage('Review this code: function foo() {}');
console.log(response.text);

// With tool execution
const result = await app.sendMessage('Analyze this TypeScript code...', {
  executeTool: async (toolUse) => {
    // Approve and execute
    return true;
  }
});
```

### Layer 3: Agentic Loop (ClineAgent)

**Purpose**: Full autonomous agent with iterative reasoning and action.

**Use Cases**:
- Autonomous coding assistants
- Task automation
- Multi-step problem solving
- Research and analysis

**Features**:
- Autonomous iteration loop
- Tool execution with approval
- State management
- Event system
- Host abstraction

**Example**:
```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost(),
  maxIterations: 25,
  
  onToolUse: async (tool) => {
    console.log(`Agent wants to use: ${tool.name}`);
    return true; // Approve
  }
});

// Execute autonomous task
const result = await agent.executeTask(
  'Create a REST API with Express.js'
);
```

### Layer 4: Multi-Agent Orchestration (AgentOrchestrator)

**Purpose**: Coordinate multiple agents and complex workflows.

**Use Cases**:
- Multi-agent systems
- Workflow automation
- Distributed task execution
- Specialized agent teams

**Features**:
- Agent coordination
- Task decomposition
- Result aggregation
- Inter-agent communication
- Workflow definition

**Example**:
```typescript
import { AgentOrchestrator } from '@cline/framework/orchestrator';

const orchestrator = new AgentOrchestrator();

// Define specialized agents
const coder = orchestrator.createAgent({
  name: 'coder',
  role: 'Write code',
  config: { /* agent config */ }
});

const reviewer = orchestrator.createAgent({
  name: 'reviewer',
  role: 'Review code',
  config: { /* agent config */ }
});

const tester = orchestrator.createAgent({
  name: 'tester',
  role: 'Test code',
  config: { /* agent config */ }
});

// Define workflow
const workflow = orchestrator.createWorkflow({
  name: 'code-review-test',
  steps: [
    { agent: 'coder', task: 'Implement feature' },
    { agent: 'reviewer', task: 'Review code', dependsOn: ['coder'] },
    { agent: 'tester', task: 'Write tests', dependsOn: ['coder'] }
  ]
});

// Execute workflow
const result = await orchestrator.execute(workflow, {
  input: 'Create a user authentication system'
});
```

## Customization Points

### Layer 1 Customization

**What you can customize**:
- Raw API parameters (temperature, top_p, etc.)
- Request/response format
- Streaming behavior
- Error handling
- Rate limiting
- Retries

**How to customize**:
```typescript
const client = new LLMClient({
  provider: 'anthropic',
  apiKey: key,
  model: 'claude-3-5-sonnet-20241022',
  
  // Custom parameters
  defaultParams: {
    temperature: 0.9,
    top_p: 0.95,
    top_k: 40
  },
  
  // Custom retry logic
  retryConfig: {
    maxRetries: 3,
    backoff: 'exponential'
  },
  
  // Custom transformers
  requestTransformer: (req) => {
    // Modify request before sending
    return req;
  },
  responseTransformer: (res) => {
    // Modify response after receiving
    return res;
  }
});
```

### Layer 2 Customization

**What you can customize**:
- System prompt templates
- Conversation history size
- Tool execution policy
- Response formatting
- Context management

**How to customize**:
```typescript
const app = new SimpleLLM({
  // ... basic config
  
  // Custom system prompt with variables
  systemPrompt: `You are a ${role} assistant.
    Guidelines: ${guidelines}
    Context: ${context}`,
  
  // Conversation management
  conversationConfig: {
    maxMessages: 20,
    summarizeAfter: 10,
    includeSystem: true
  },
  
  // Tool execution policy
  toolPolicy: {
    requireApproval: ['file_write', 'command_exec'],
    autoApprove: ['file_read', 'search'],
    timeout: 30000
  },
  
  // Custom message formatter
  formatMessage: (msg) => {
    // Transform message before sending
    return msg;
  }
});
```

### Layer 3 Customization

**What you can customize**:
- Host adapter (environment integration)
- Tool handlers
- Iteration control
- State management
- Event handling
- Approval workflow

**How to customize**:
```typescript
// Custom host adapter
class CustomHost implements HostAdapter {
  async readFile(path: string): Promise<string> {
    // Your custom file reading logic
  }
  
  async executeCommand(cmd: string): Promise<CommandResult> {
    // Your custom command execution
  }
  
  // ... implement other methods
}

// Custom tools
const customTool: ToolHandler = {
  name: 'custom_analysis',
  description: 'Perform custom analysis',
  parameters: { /* schema */ },
  
  execute: async (params, context) => {
    // Your custom logic with access to context
    const files = await context.host.listFiles(context.workingDirectory);
    // ... do work
    return { status: 'success', output: 'Done' };
  }
};

const agent = new ClineAgent({
  // ... basic config
  host: new CustomHost(),
  tools: [customTool, ...getDefaultTools()],
  
  // Custom iteration control
  maxIterations: 50,
  iterationTimeout: 60000,
  
  // Custom state management
  stateManager: new CustomStateManager(),
  
  // Event handlers for monitoring
  onStateChange: (state) => {
    // Track state changes
  },
  onToolUse: async (tool) => {
    // Custom approval logic
    if (tool.name === 'dangerous_op') {
      return await getUserApproval();
    }
    return true;
  }
});
```

### Layer 4 Customization

**What you can customize**:
- Agent coordination strategy
- Workflow definitions
- Communication protocols
- Resource allocation
- Result aggregation

**How to customize**:
```typescript
const orchestrator = new AgentOrchestrator({
  // Coordination strategy
  strategy: 'sequential', // or 'parallel', 'dynamic'
  
  // Resource limits
  maxConcurrentAgents: 3,
  resourcePool: {
    memory: '4GB',
    timeout: 300000
  },
  
  // Communication
  messagebus: new CustomMessageBus(),
  
  // Custom workflow executor
  executor: {
    beforeStep: async (step, context) => {
      // Pre-step logic
    },
    afterStep: async (step, result, context) => {
      // Post-step logic
    },
    onError: async (error, step, context) => {
      // Error handling
    }
  }
});
```

## Mixing Layers

You can mix and match layers for different use cases:

### Example 1: Custom LLM with Standard Agent

```typescript
// Layer 1: Custom LLM client
const customClient = new LLMClient({
  provider: 'custom',
  baseUrl: 'https://my-llm.com',
  // ... custom config
});

// Layer 3: Use with standard agent
const agent = new ClineAgent({
  llmClient: customClient, // Inject custom client
  host: new TerminalHost(),
  // ... rest of config
});
```

### Example 2: Simple LLM with Custom Tools

```typescript
// Layer 2: Simple LLM
const app = new SimpleLLM({ /* config */ });

// Add Layer 3 tools
import { getDefaultTools } from '@cline/framework/tools';
for (const tool of getDefaultTools()) {
  app.addTool(tool);
}
```

### Example 3: Full Stack with All Layers

```typescript
// Layer 1: Custom provider
const provider = createCustomProvider();

// Layer 2: Build simple app
const simpleApp = new SimpleLLM({ provider });

// Layer 3: Create agent with simple app
const agent = new ClineAgent({
  llmApp: simpleApp,
  // ... config
});

// Layer 4: Orchestrate multiple agents
const orchestrator = new AgentOrchestrator();
orchestrator.addAgent('main', agent);
```

## Migration Guide

### From Current to Layered

**Current Usage**:
```typescript
const agent = new ClineAgent({ /* config */ });
await agent.executeTask('Do something');
```

**Layer 1 (Direct API)**:
```typescript
const client = new LLMClient({ /* config */ });
for await (const chunk of client.streamCompletion({ /* params */ })) {
  // Process chunks
}
```

**Layer 2 (Simple App)**:
```typescript
const app = new SimpleLLM({ /* config */ });
const response = await app.sendMessage('Do something');
```

**Layer 3 (Current Agent)** - No change needed

**Layer 4 (Orchestration)**:
```typescript
const orchestrator = new AgentOrchestrator();
const agent = orchestrator.createAgent({ /* config */ });
await orchestrator.execute(workflow);
```

## Best Practices

### Choosing the Right Layer

**Use Layer 1 when**:
- Building custom frameworks
- Need complete API control
- Performance is critical
- Want minimal dependencies

**Use Layer 2 when**:
- Building chatbots
- Simple Q&A systems
- Single-turn interactions
- Don't need autonomy

**Use Layer 3 when**:
- Need autonomous agents
- Multi-step tasks
- Tool execution
- Iterative problem solving

**Use Layer 4 when**:
- Coordinating multiple agents
- Complex workflows
- Specialized agent teams
- Distributed systems

### Performance Considerations

**Layer 1**: Lowest overhead, direct API access
**Layer 2**: Minimal overhead, adds conversation management
**Layer 3**: Moderate overhead, adds iteration loop and state
**Layer 4**: Higher overhead, adds coordination logic

### Testing Strategies

Each layer should be tested independently:

```typescript
// Layer 1 tests
describe('LLMClient', () => {
  it('should stream responses', async () => {
    const client = new LLMClient({ /* config */ });
    // Test streaming
  });
});

// Layer 2 tests
describe('SimpleLLM', () => {
  it('should manage conversation', async () => {
    const app = new SimpleLLM({ /* config */ });
    // Test conversation
  });
});

// Layer 3 tests  
describe('ClineAgent', () => {
  it('should execute tasks', async () => {
    const agent = new ClineAgent({ /* config */ });
    // Test task execution
  });
});

// Layer 4 tests
describe('AgentOrchestrator', () => {
  it('should coordinate agents', async () => {
    const orchestrator = new AgentOrchestrator();
    // Test coordination
  });
});
```

## Advanced Patterns

### Pattern 1: Hierarchical Agents

```typescript
// Layer 4 orchestrator manages Layer 3 agents
const orchestrator = new AgentOrchestrator();

const supervisor = orchestrator.createAgent({
  role: 'supervisor',
  canDelegateToOthers: true
});

const workers = ['coder', 'tester', 'reviewer'].map(role =>
  orchestrator.createAgent({ role })
);
```

### Pattern 2: Hybrid Applications

```typescript
// Mix Layer 2 and Layer 3
class HybridAgent {
  private simpleApp: SimpleLLM;
  private fullAgent: ClineAgent;
  
  async process(task: string) {
    // Try simple approach first
    const simple = await this.simpleApp.sendMessage(task);
    
    if (simple.needsMoreWork) {
      // Escalate to full agent
      return await this.fullAgent.executeTask(task);
    }
    
    return simple;
  }
}
```

### Pattern 3: Custom Layer Creation

```typescript
// Create your own layer between 2 and 3
class SemiAutonomousAgent extends SimpleLLM {
  private maxToolCalls: number = 3;
  
  async executeWithLimitedAutonomy(task: string) {
    let calls = 0;
    
    while (calls < this.maxToolCalls) {
      const response = await this.sendMessage(task);
      
      if (response.wantsToUseTool) {
        await this.executeTool(response.tool);
        calls++;
      } else {
        break;
      }
    }
  }
}
```

## Summary

The layered architecture provides:

1. **Flexibility**: Use only what you need
2. **Composability**: Mix and match layers
3. **Extensibility**: Customize at any level
4. **Progressive Enhancement**: Start simple, add complexity as needed
5. **Clear Separation**: Each layer has distinct responsibilities

Choose the layer that matches your use case complexity, and customize as needed.
