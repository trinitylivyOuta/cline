# Layered Architecture Guide

## Introduction

The Cline Framework now provides four distinct layers of abstraction, allowing you to choose the right level of complexity for your use case. This guide helps you understand when and how to use each layer.

## Quick Layer Selection

**Choose Layer 1 (LLMClient)** if you need:
- Direct API control
- Custom request/response handling
- Minimal dependencies
- Maximum performance

**Choose Layer 2 (SimpleLLM)** if you need:
- Chatbot functionality
- Conversation management
- Single-turn tool calling
- Simple Q&A systems

**Choose Layer 3 (ClineAgent)** if you need:
- Autonomous task execution
- Multi-step reasoning
- Tool-using agents
- Iterative problem solving

**Choose Layer 4 (AgentOrchestrator)** if you need:
- Multiple specialized agents
- Complex workflows
- Task decomposition
- Agent coordination

## Layer 1: Raw LLM Client

### Overview

The LLMClient provides direct access to LLM APIs with minimal abstraction. It handles streaming, retries, and basic error handling, but leaves all higher-level logic to you.

### Installation

```typescript
import { LLMClient } from '@cline/framework';
```

### Basic Usage

```typescript
const client = new LLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// Stream a completion
for await (const chunk of client.streamCompletion({
  system: 'You are a helpful assistant',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})) {
  if (chunk.type === 'text_delta') {
    process.stdout.write(chunk.text);
  }
}
```

### Advanced Configuration

```typescript
const client = new LLMClient({
  provider: 'anthropic',
  apiKey: apiKey,
  model: 'claude-3-5-sonnet-20241022',
  
  // Custom default parameters
  defaultParams: {
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: 8192
  },
  
  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000
  },
  
  // Custom transformers
  requestTransformer: (req) => {
    // Modify request before sending
    console.log('Sending request:', req);
    return req;
  },
  responseTransformer: (res) => {
    // Modify response after receiving
    return res;
  }
});
```

### Use Cases

1. **Custom LLM Integration**
```typescript
// Building a custom chat interface
class CustomChat {
  private client: LLMClient;
  
  async chat(message: string) {
    let response = '';
    
    for await (const chunk of this.client.streamCompletion({
      messages: [{ role: 'user', content: message }]
    })) {
      if (chunk.type === 'text_delta') {
        response += chunk.text;
        this.updateUI(chunk.text);
      }
    }
    
    return response;
  }
}
```

2. **Performance-Critical Applications**
```typescript
// Batch processing with direct API control
async function processDocuments(docs: string[]) {
  const client = new LLMClient({ /* config */ });
  
  const results = await Promise.all(
    docs.map(doc => client.getCompletion({
      messages: [{ role: 'user', content: `Summarize: ${doc}` }]
    }))
  );
  
  return results.map(r => r.text);
}
```

3. **Custom Protocol Implementation**
```typescript
// Implementing custom streaming protocol
async function *customStream(query: string) {
  const client = new LLMClient({ /* config */ });
  
  for await (const chunk of client.streamCompletion({
    messages: [{ role: 'user', content: query }]
  })) {
    // Transform to custom format
    if (chunk.type === 'text_delta') {
      yield {
        type: 'message',
        data: chunk.text,
        timestamp: Date.now()
      };
    }
  }
}
```

## Layer 2: Simple LLM Application

### Overview

SimpleLLM adds conversation management, tool calling, and response handling on top of the raw client. Perfect for chatbots and Q&A systems.

### Installation

```typescript
import { SimpleLLM } from '@cline/framework';
```

### Basic Usage

```typescript
const app = new SimpleLLM({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: 'You are a helpful assistant.'
});

// Send a message
const response = await app.sendMessage('What is TypeScript?');
console.log(response.text);

// Conversation history is maintained automatically
const followUp = await app.sendMessage('Give me an example');
console.log(followUp.text);
```

### Adding Tools

```typescript
app.addTool({
  name: 'search_database',
  description: 'Search the product database',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number' }
    },
    required: ['query']
  },
  execute: async (params, context) => {
    const results = await database.search(params.query, params.limit);
    return {
      status: 'success',
      output: JSON.stringify(results)
    };
  }
});
```

### Conversation Management

```typescript
// Configure conversation handling
const app = new SimpleLLM({
  // ... basic config
  conversationConfig: {
    maxMessages: 20, // Keep last 20 messages
    summarizeAfter: 10, // Summarize after 10 messages
    includeSystem: true // Include system prompt
  }
});

// Export conversation
const json = app.exportConversation();
fs.writeFileSync('conversation.json', json);

// Import conversation
const loaded = fs.readFileSync('conversation.json', 'utf-8');
app.importConversation(loaded);

// Clear conversation
app.clearConversation();

// Get stats
const stats = app.getStats();
console.log(`Messages: ${stats.messageCount}`);
console.log(`Tools: ${stats.toolsRegistered}`);
```

### Tool Policy

```typescript
const app = new SimpleLLM({
  // ... basic config
  toolPolicy: {
    requireApproval: ['file_write', 'command_exec'],
    autoApprove: ['file_read', 'search'],
    timeout: 30000
  }
});

// Handle tool approval
const response = await app.sendMessage('Search for users', {
  executeTool: async (toolCall) => {
    if (toolCall.name === 'file_write') {
      return await getUserApproval(toolCall);
    }
    return true; // Auto-approve other tools
  }
});
```

### Use Cases

1. **Customer Support Chatbot**
```typescript
class SupportBot {
  private app: SimpleLLM;
  
  constructor() {
    this.app = new SimpleLLM({
      systemPrompt: 'You are a customer support agent...',
      conversationConfig: { maxMessages: 30 }
    });
    
    this.addSupportTools();
  }
  
  private addSupportTools() {
    this.app.addTool({
      name: 'lookup_order',
      description: 'Look up order status',
      execute: async (params) => {
        // Query order system
        return { status: 'success', output: '...' };
      }
    });
  }
  
  async handleMessage(userId: string, message: string) {
    return await this.app.sendMessage(message, {
      metadata: { userId },
      onStream: (text) => this.sendToUser(userId, text)
    });
  }
}
```

2. **Interactive Q&A System**
```typescript
class QASystem {
  private app: SimpleLLM;
  
  async answer(question: string, context?: string[]) {
    if (context) {
      const contextText = context.join('\n');
      question = `Context:\n${contextText}\n\nQuestion: ${question}`;
    }
    
    const response = await this.app.sendMessage(question);
    return response.text;
  }
  
  async askFollowUp(question: string) {
    // Maintains conversation context
    return await this.app.sendMessage(question);
  }
}
```

## Layer 3: Agentic Loop (ClineAgent)

### Overview

ClineAgent provides full autonomous execution with iterative reasoning and tool use. This is the main agent implementation.

### Usage

See the main [README.md](../README.md) and [USAGE_GUIDE.md](./USAGE_GUIDE.md) for comprehensive ClineAgent documentation.

### Quick Example

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost(),
  maxIterations: 25
});

const result = await agent.executeTask(
  'Create a REST API with Express.js'
);
```

## Layer 4: Agent Orchestration

### Overview

AgentOrchestrator coordinates multiple agents to work together on complex tasks.

### Basic Usage

```typescript
import { AgentOrchestrator } from '@cline/framework';

const orchestrator = new AgentOrchestrator({
  strategy: 'dynamic', // or 'sequential', 'parallel'
  maxConcurrentAgents: 3
});

// Create specialized agents
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
```

### Creating Workflows

```typescript
const workflow = orchestrator.createWorkflow({
  name: 'Development Pipeline',
  steps: [
    {
      id: 'design',
      agent: 'architect',
      task: 'Design system for {{input}}'
    },
    {
      id: 'implement',
      agent: 'coder',
      task: 'Implement {{step.design.output}}',
      dependsOn: ['design']
    },
    {
      id: 'review',
      agent: 'reviewer',
      task: 'Review {{step.implement.output}}',
      dependsOn: ['implement']
    },
    {
      id: 'test',
      agent: 'tester',
      task: 'Test {{step.implement.output}}',
      dependsOn: ['implement']
    }
  ]
});

// Execute workflow
const result = await orchestrator.execute(
  workflow,
  'a user authentication system'
);
```

### Execution Strategies

```typescript
// Sequential: One step at a time
const orchestrator = new AgentOrchestrator({
  strategy: 'sequential'
});

// Parallel: All steps at once (ignoring dependencies)
const orchestrator = new AgentOrchestrator({
  strategy: 'parallel',
  maxConcurrentAgents: 5
});

// Dynamic: Respect dependencies, parallelize when possible
const orchestrator = new AgentOrchestrator({
  strategy: 'dynamic',
  maxConcurrentAgents: 3
});
```

### Event Monitoring

```typescript
orchestrator.on('workflow:start', (id, name) => {
  console.log(`Workflow ${name} started`);
});

orchestrator.on('step:start', (stepId, agent) => {
  console.log(`Step ${stepId} starting on ${agent}`);
});

orchestrator.on('step:complete', (stepId, result) => {
  console.log(`Step ${stepId} completed: ${result.status}`);
});

orchestrator.on('workflow:complete', (id, result) => {
  console.log(`Workflow completed in ${result.duration}ms`);
});
```

### Use Cases

1. **Software Development Team**
```typescript
const orchestrator = new AgentOrchestrator();

// Create team
const architect = orchestrator.createAgent({
  name: 'architect',
  role: 'System design and architecture'
});

const frontendDev = orchestrator.createAgent({
  name: 'frontend',
  role: 'UI/UX implementation'
});

const backendDev = orchestrator.createAgent({
  name: 'backend',
  role: 'API and business logic'
});

const tester = orchestrator.createAgent({
  name: 'tester',
  role: 'Quality assurance'
});

// Define development workflow
const workflow = orchestrator.createWorkflow({
  name: 'Feature Development',
  steps: [
    { id: 'design', agent: 'architect', task: 'Design {{input}}' },
    { id: 'frontend', agent: 'frontend', task: 'Build UI', dependsOn: ['design'] },
    { id: 'backend', agent: 'backend', task: 'Build API', dependsOn: ['design'] },
    { id: 'test', agent: 'tester', task: 'Test', dependsOn: ['frontend', 'backend'] }
  ]
});
```

2. **Research and Analysis Pipeline**
```typescript
const workflow = orchestrator.createWorkflow({
  name: 'Research Pipeline',
  steps: [
    {
      id: 'research',
      agent: 'researcher',
      task: 'Research {{input}} and gather information'
    },
    {
      id: 'analyze',
      agent: 'analyst',
      task: 'Analyze findings: {{step.research.output}}',
      dependsOn: ['research']
    },
    {
      id: 'summarize',
      agent: 'writer',
      task: 'Create executive summary: {{step.analyze.output}}',
      dependsOn: ['analyze']
    }
  ]
});
```

## Mixing Layers

You can combine layers for custom behavior:

### Example 1: Custom Client with Standard Agent

```typescript
// Layer 1: Custom client with special configuration
const customClient = new LLMClient({
  provider: 'anthropic',
  apiKey: apiKey,
  defaultParams: { temperature: 0.9 },
  requestTransformer: (req) => {
    // Add custom headers or modify request
    return req;
  }
});

// Layer 3: Use with agent
const agent = new ClineAgent({
  llmClient: customClient,
  host: new TerminalHost(),
  // ... rest of config
});
```

### Example 2: Simple App as Agent Component

```typescript
// Layer 2: Simple app for preprocessing
const preprocessor = new SimpleLLM({
  systemPrompt: 'Extract key information from input'
});

// Layer 3: Agent using preprocessor
const agent = new ClineAgent({
  /* config */
});

async function executeWithPreprocessing(task: string) {
  // Preprocess with SimpleLLM
  const processed = await preprocessor.sendMessage(
    `Extract key requirements: ${task}`
  );
  
  // Execute with full agent
  return await agent.executeTask(processed.text);
}
```

### Example 3: Hybrid Decision Making

```typescript
class HybridSystem {
  private simple: SimpleLLM;
  private agent: ClineAgent;
  
  async process(task: string) {
    // Try simple approach first (faster, cheaper)
    const simple = await this.simple.sendMessage(task);
    
    // Check if simple approach is sufficient
    if (simple.stopReason === 'end_turn' && !simple.toolCalls) {
      return simple.text;
    }
    
    // Escalate to full agent for complex tasks
    return await this.agent.executeTask(task);
  }
}
```

## Best Practices

### Layer 1 Best Practices

1. **Error Handling**: Always handle errors in streaming
2. **Resource Management**: Close connections properly
3. **Rate Limiting**: Implement your own rate limiting
4. **Monitoring**: Add logging for debugging

### Layer 2 Best Practices

1. **Conversation Size**: Configure maxMessages appropriately
2. **Tool Approval**: Always validate tool calls
3. **System Prompts**: Make them clear and specific
4. **Export/Import**: Save conversations for analysis

### Layer 3 Best Practices

1. **Iteration Limits**: Set reasonable maxIterations
2. **Tool Selection**: Only include necessary tools
3. **Event Handling**: Monitor agent behavior
4. **Host Adapter**: Choose the right host for your environment

### Layer 4 Best Practices

1. **Step Dependencies**: Define clear dependencies
2. **Error Recovery**: Add retry logic
3. **Resource Limits**: Set maxConcurrentAgents
4. **Monitoring**: Listen to orchestrator events

## Performance Comparison

| Layer | Overhead | Latency | Memory | Best For |
|-------|----------|---------|--------|----------|
| 1     | Minimal  | Lowest  | Low    | Direct control |
| 2     | Low      | Low     | Medium | Chatbots |
| 3     | Medium   | Medium  | Medium | Autonomous tasks |
| 4     | High     | Higher  | High   | Multi-agent systems |

## Debugging Tips

### Layer 1 Debugging

```typescript
const client = new LLMClient({
  // ... config
  requestTransformer: (req) => {
    console.log('Request:', JSON.stringify(req, null, 2));
    return req;
  },
  responseTransformer: (res) => {
    console.log('Response:', res);
    return res;
  }
});
```

### Layer 2 Debugging

```typescript
const app = new SimpleLLM({ /* config */ });

// Monitor all messages
app.on('message', (msg) => {
  console.log('Message:', msg);
});

// Export conversation for inspection
const conversation = app.exportConversation();
fs.writeFileSync('debug.json', conversation);
```

### Layer 3 Debugging

```typescript
const agent = new ClineAgent({
  // ... config
  onMessage: (msg) => console.log('Message:', msg),
  onToolUse: async (tool) => {
    console.log('Tool use:', tool);
    return true;
  }
});

agent.on('stateChange', (state) => {
  console.log('State:', state);
});
```

### Layer 4 Debugging

```typescript
const orchestrator = new AgentOrchestrator({
  // ... config
  executor: {
    beforeStep: async (step, context) => {
      console.log('Before step:', step.id);
      console.log('Context:', context);
    },
    afterStep: async (step, result, context) => {
      console.log('After step:', step.id);
      console.log('Result:', result);
    }
  }
});
```

## Migration Guide

### From Layer 3 to Layer 2 (Simplification)

```typescript
// Before (Layer 3)
const agent = new ClineAgent({ /* config */ });
await agent.executeTask('Do something');

// After (Layer 2)
const app = new SimpleLLM({ /* config */ });
await app.sendMessage('Do something');
```

### From Layer 2 to Layer 3 (Add Autonomy)

```typescript
// Before (Layer 2)
const app = new SimpleLLM({ /* config */ });
const response = await app.sendMessage('Create a server');

// After (Layer 3)
const agent = new ClineAgent({ /* config */ });
const result = await agent.executeTask('Create a server');
// Agent will iterate until complete
```

### From Layer 3 to Layer 4 (Add Coordination)

```typescript
// Before (Layer 3)
const agent = new ClineAgent({ /* config */ });
await agent.executeTask('Complex project');

// After (Layer 4)
const orchestrator = new AgentOrchestrator();
const specialist1 = orchestrator.createAgent({ /* config */ });
const specialist2 = orchestrator.createAgent({ /* config */ });
const workflow = orchestrator.createWorkflow({ /* steps */ });
await orchestrator.execute(workflow, 'Complex project');
```

## Conclusion

The layered architecture provides flexibility to choose the right level of abstraction for your needs. Start with the simplest layer that meets your requirements, and move up only when necessary.

For more examples, see the demo files:
- `demo/layer1-raw-api.js`
- `demo/layer2-simple-app.js`
- `demo/simple-agent.js` (Layer 3)
- `demo/layer4-orchestration.js`
