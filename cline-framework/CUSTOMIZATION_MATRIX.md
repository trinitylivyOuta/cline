# Cline Framework - Customization Matrix

## Overview

This document provides a complete reference for all customization points across the Cline Framework's 4 layers.

## Quick Reference

| What You Want to Customize | Which Layer | How |
|----------------------------|-------------|-----|
| **Raw API parameters** | Layer 1 | LLMClient config |
| **Request/response format** | Layer 1 | Transformers |
| **Streaming behavior** | Layer 1 | Stream handling |
| **Conversation history** | Layer 2 | SimpleLLM config |
| **Tool execution policy** | Layer 2 | Tool policy |
| **System prompts** | Layer 2, 3 | Config |
| **Host environment** | Layer 3 | HostAdapter |
| **Tool handlers** | Layer 3 | ToolHandler |
| **Iteration control** | Layer 3 | AgentConfig |
| **Workflow definition** | Layer 4 | Workflow |
| **Agent coordination** | Layer 4 | Orchestrator config |

## Layer 1: LLM Client Customization

### API Parameters

```typescript
const client = new LLMClient({
  provider: 'anthropic',
  apiKey: key,
  model: 'claude-3-5-sonnet-20241022',
  
  // Customize default parameters
  defaultParams: {
    temperature: 0.9,      // Creativity (0.0-1.0)
    top_p: 0.95,          // Nucleus sampling
    top_k: 40,            // Top-k sampling
    max_tokens: 8192      // Response length
  }
});
```

### Request/Response Transformation

```typescript
const client = new LLMClient({
  // ... basic config
  
  // Transform outgoing requests
  requestTransformer: (req) => {
    // Add custom headers
    req.headers = { ...req.headers, 'X-Custom': 'value' };
    
    // Modify system prompt
    req.system = `[ENHANCED] ${req.system}`;
    
    // Log for debugging
    console.log('Request:', req);
    
    return req;
  },
  
  // Transform incoming responses
  responseTransformer: (res) => {
    // Filter or modify response
    console.log('Response:', res);
    return res;
  }
});
```

### Retry Configuration

```typescript
const client = new LLMClient({
  // ... basic config
  
  retryConfig: {
    maxRetries: 3,              // Number of retries
    backoff: 'exponential',     // 'linear' or 'exponential'
    initialDelay: 1000          // Initial delay in ms
  }
});
```

### Custom Streaming

```typescript
// Custom stream processing
async function *customStream(query: string) {
  const client = new LLMClient({ /* config */ });
  
  let buffer = '';
  
  for await (const chunk of client.streamCompletion({
    messages: [{ role: 'user', content: query }]
  })) {
    if (chunk.type === 'text_delta') {
      buffer += chunk.text;
      
      // Custom buffering logic
      if (buffer.includes('\n')) {
        yield { type: 'line', content: buffer };
        buffer = '';
      }
    }
  }
  
  if (buffer) {
    yield { type: 'line', content: buffer };
  }
}
```

## Layer 2: Simple LLM Customization

### System Prompt Templates

```typescript
const app = new SimpleLLM({
  // ... basic config
  
  // Template with variables
  systemPrompt: `You are a ${role} assistant.
    Guidelines: ${guidelines}
    Context: ${context}
    Current date: ${new Date().toISOString()}`
});

// Dynamic prompt updates
app.setSystemPrompt(newPrompt);
```

### Conversation Management

```typescript
const app = new SimpleLLM({
  // ... basic config
  
  conversationConfig: {
    maxMessages: 20,        // Keep last N messages
    summarizeAfter: 10,     // Summarize after N messages
    includeSystem: true     // Include system in export
  }
});

// Manual management
const history = app.getConversation();
const exported = app.exportConversation();
app.importConversation(exported);
app.clearConversation();
```

### Tool Policy

```typescript
const app = new SimpleLLM({
  // ... basic config
  
  toolPolicy: {
    // Tools requiring approval
    requireApproval: [
      'file_write',
      'execute_command',
      'delete_file'
    ],
    
    // Auto-approved tools
    autoApprove: [
      'file_read',
      'search',
      'calculate'
    ],
    
    // Tool execution timeout
    timeout: 30000  // 30 seconds
  }
});
```

### Custom Tool Handler

```typescript
app.addTool({
  name: 'custom_tool',
  description: 'Perform custom operation',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' },
      options: {
        type: 'object',
        properties: {
          flag1: { type: 'boolean' },
          flag2: { type: 'string' }
        }
      }
    },
    required: ['input']
  },
  execute: async (params, context) => {
    // Access conversation history
    const history = context.conversationHistory;
    
    // Access metadata
    const userId = context.metadata.userId;
    
    // Custom logic
    const result = await performCustomOperation(params);
    
    return {
      status: 'success',
      output: result
    };
  }
});
```

### Message Options

```typescript
const response = await app.sendMessage('Do something', {
  // Stream response
  onStream: (text) => {
    process.stdout.write(text);
  },
  
  // Handle tool approval
  executeTool: async (toolCall) => {
    if (toolCall.name === 'dangerous_op') {
      return await getUserApproval(toolCall);
    }
    return true; // Auto-approve others
  },
  
  // Custom metadata
  metadata: {
    userId: 'user123',
    sessionId: 'session456'
  }
});
```

## Layer 3: Agent Customization

### Host Adapter

```typescript
class CustomHost implements HostAdapter {
  // File operations
  async readFile(path: string): Promise<string> {
    // Custom file reading (e.g., from S3, database)
    return await s3.getObject(path);
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    // Custom file writing
    await s3.putObject(path, content);
  }
  
  async fileExists(path: string): Promise<boolean> {
    // Custom existence check
    return await s3.objectExists(path);
  }
  
  async listFiles(dir: string, pattern?: string): Promise<string[]> {
    // Custom listing
    return await s3.listObjects(dir, pattern);
  }
  
  // Command execution
  async executeCommand(cmd: string, workingDir?: string): Promise<CommandResult> {
    // Custom command execution (e.g., in container, remote)
    return await remoteExecutor.run(cmd, workingDir);
  }
  
  // Directory operations
  getCurrentDirectory(): string {
    return this.currentDir;
  }
  
  setCurrentDirectory(path: string): void {
    this.currentDir = path;
  }
  
  // User interaction
  async askUser(question: string, options?: AskOptions): Promise<string> {
    // Custom user interaction (e.g., Slack, web UI)
    return await slack.askUser(question, options);
  }
  
  // Display messages
  async showMessage(message: string, type: MessageType): Promise<void> {
    // Custom display (e.g., logging, UI)
    await logger.log(type, message);
  }
  
  // Optional: Browser operations
  async openUrl?(url: string): Promise<void> {
    await browser.open(url);
  }
  
  // Optional: Diff generation
  async getDiff?(original: string, modified: string): Promise<string> {
    return generateDiff(original, modified);
  }
}

// Use custom host
const agent = new ClineAgent({
  // ... basic config
  host: new CustomHost()
});
```

### Tool Handlers

```typescript
const customTool: ToolHandler = {
  name: 'advanced_tool',
  description: 'Perform advanced operation',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['analyze', 'transform', 'validate']
      },
      target: { type: 'string' },
      options: { type: 'object' }
    },
    required: ['operation', 'target']
  },
  
  execute: async (params, context) => {
    // Access host adapter
    const content = await context.host.readFile(params.target);
    
    // Access working directory
    const fullPath = path.join(context.workingDirectory, params.target);
    
    // Access conversation
    const messages = context.conversation;
    
    // Access task ID
    const taskId = context.taskId;
    
    // Perform operation
    let result;
    switch (params.operation) {
      case 'analyze':
        result = await analyzeContent(content);
        break;
      case 'transform':
        result = await transformContent(content, params.options);
        break;
      case 'validate':
        result = await validateContent(content);
        break;
    }
    
    return {
      status: 'success',
      output: JSON.stringify(result)
    };
  }
};

const agent = new ClineAgent({
  // ... basic config
  tools: [customTool, ...getDefaultTools()]
});
```

### Agent Configuration

```typescript
const agent = new ClineAgent({
  // API configuration
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  apiBaseUrl: 'https://custom-endpoint.com',
  
  // Host adapter
  host: new CustomHost(),
  
  // System prompt
  systemPrompt: `You are an expert ${domain} assistant.
    Follow these guidelines:
    ${guidelines}`,
  
  // Tools
  tools: [customTool1, customTool2, ...getDefaultTools()],
  
  // Execution control
  maxIterations: 50,        // Max reasoning loops
  temperature: 0.7,         // LLM temperature
  maxTokens: 8096,         // Max tokens per response
  
  // Callbacks
  onMessage: (message) => {
    // Monitor messages
    logger.log('Message:', message);
  },
  
  onToolUse: async (tool) => {
    // Custom approval logic
    if (tool.name === 'execute_command') {
      const command = tool.input.command;
      if (isDangerous(command)) {
        return await getUserApproval(tool);
      }
    }
    return true;
  },
  
  onComplete: (result) => {
    // Handle completion
    notifyUser(result);
  }
});
```

### Event Handling

```typescript
// State changes
agent.on('stateChange', (state) => {
  console.log('Status:', state.status);
  console.log('Iteration:', state.currentIteration);
  console.log('Tokens:', state.tokensUsed);
});

// Messages
agent.on('message', (message) => {
  console.log('Role:', message.role);
  console.log('Content:', message.content);
});

// Tool usage
agent.on('toolUse', (tool) => {
  console.log('Tool:', tool.name);
  console.log('Input:', tool.input);
});

// Completion
agent.on('complete', (result) => {
  console.log('Result:', result);
});

// Errors
agent.on('error', (error) => {
  console.error('Error:', error);
});
```

## Layer 4: Orchestration Customization

### Orchestrator Configuration

```typescript
const orchestrator = new AgentOrchestrator({
  // Execution strategy
  strategy: 'dynamic',  // 'sequential', 'parallel', or 'dynamic'
  
  // Resource limits
  maxConcurrentAgents: 3,
  resourcePool: {
    memory: '4GB',
    timeout: 300000  // 5 minutes
  },
  
  // Custom message bus
  messagebus: customEventEmitter,
  
  // Workflow hooks
  executor: {
    beforeStep: async (step, context) => {
      // Pre-step logic
      console.log(`Starting ${step.id}...`);
      await logToDatabase(step);
    },
    
    afterStep: async (step, result, context) => {
      // Post-step logic
      console.log(`Completed ${step.id}`);
      await saveResult(step, result);
      
      // Update shared context
      context.sharedData.set(step.id + '_result', result);
    },
    
    onError: async (error, step, context) => {
      // Error handling
      console.error(`Error in ${step.id}:`, error);
      await notifyAdmin(error, step);
      
      // Decide whether to continue
      if (isCriticalError(error)) {
        throw error;
      }
    }
  }
});
```

### Agent Definitions

```typescript
// Create specialized agents
const architect = orchestrator.createAgent({
  name: 'architect',
  role: 'System architecture and design',
  config: {
    apiProvider: 'anthropic',
    apiKey: apiKey,
    model: 'claude-3-5-sonnet-20241022',
    host: new CustomHost(),
    systemPrompt: 'You are a senior software architect...',
    maxIterations: 10
  },
  capabilities: ['design', 'architecture', 'planning'],
  priority: 1  // Higher priority
});

const developer = orchestrator.createAgent({
  name: 'developer',
  role: 'Code implementation',
  config: {
    apiProvider: 'anthropic',
    apiKey: apiKey,
    model: 'claude-3-5-sonnet-20241022',
    host: new CustomHost(),
    systemPrompt: 'You are an expert programmer...',
    maxIterations: 20
  },
  capabilities: ['coding', 'implementation'],
  priority: 2
});
```

### Workflow Definitions

```typescript
const workflow = orchestrator.createWorkflow({
  name: 'Software Development',
  description: 'Complete development pipeline',
  
  steps: [
    {
      id: 'design',
      agent: 'architect',
      task: 'Design system architecture for {{input}}',
      timeout: 60000,
      retries: 2
    },
    {
      id: 'frontend',
      agent: 'frontend_dev',
      task: 'Implement UI based on: {{step.design.output}}',
      dependsOn: ['design'],
      timeout: 120000,
      retries: 3,
      
      // Conditional execution
      condition: (context) => {
        return context.input.includes('web') || context.input.includes('UI');
      }
    },
    {
      id: 'backend',
      agent: 'backend_dev',
      task: 'Implement API based on: {{step.design.output}}',
      dependsOn: ['design'],
      timeout: 120000
    },
    {
      id: 'integration',
      agent: 'integrator',
      task: 'Integrate frontend {{step.frontend.output}} with backend {{step.backend.output}}',
      dependsOn: ['frontend', 'backend'],
      timeout: 90000
    },
    {
      id: 'testing',
      agent: 'tester',
      task: 'Test the complete system: {{step.integration.output}}',
      dependsOn: ['integration'],
      timeout: 60000
    }
  ],
  
  // Step callbacks
  onStepComplete: (step, result) => {
    console.log(`✅ ${step.id} completed`);
    notifyStakeholders(step, result);
  },
  
  onStepError: (step, error) => {
    console.error(`❌ ${step.id} failed:`, error);
    alertTeam(step, error);
  }
});
```

### Execution Strategies

```typescript
// Sequential execution
const sequential = new AgentOrchestrator({
  strategy: 'sequential'  // One step at a time
});

// Parallel execution
const parallel = new AgentOrchestrator({
  strategy: 'parallel',          // All steps at once
  maxConcurrentAgents: 5         // Limit parallelism
});

// Dynamic execution (recommended)
const dynamic = new AgentOrchestrator({
  strategy: 'dynamic',            // Respect dependencies
  maxConcurrentAgents: 3          // Optimize resource usage
});
```

### Event Monitoring

```typescript
orchestrator.on('workflow:start', (id, name) => {
  console.log(`🚀 Workflow ${name} started (${id})`);
});

orchestrator.on('step:start', (stepId, agent) => {
  console.log(`📍 Step ${stepId} starting on ${agent}`);
});

orchestrator.on('step:complete', (stepId, result) => {
  console.log(`✅ Step ${stepId}: ${result.status}`);
});

orchestrator.on('step:retry', (stepId, attempt) => {
  console.log(`🔄 Step ${stepId} retry attempt ${attempt}`);
});

orchestrator.on('step:error', (stepId, error) => {
  console.error(`❌ Step ${stepId} error:`, error);
});

orchestrator.on('workflow:complete', (id, result) => {
  console.log(`🎉 Workflow completed in ${result.duration}ms`);
});

orchestrator.on('workflow:error', (id, error) => {
  console.error(`💥 Workflow failed:`, error);
});

orchestrator.on('workflow:cancelled', (id) => {
  console.log(`🛑 Workflow ${id} cancelled`);
});
```

## Cross-Layer Customization

### Custom Client with Agent

```typescript
// Layer 1: Custom client
const customClient = new LLMClient({
  provider: 'anthropic',
  apiKey: apiKey,
  defaultParams: { temperature: 0.9 },
  requestTransformer: (req) => {
    // Add tracking
    req.metadata = { userId, sessionId };
    return req;
  }
});

// Layer 3: Use with agent
const agent = new ClineAgent({
  llmClient: customClient,  // Inject custom client
  host: new TerminalHost(),
  // ... rest of config
});
```

### SimpleLLM in Agent Workflow

```typescript
// Layer 2: Simple preprocessor
const preprocessor = new SimpleLLM({
  systemPrompt: 'Extract requirements from user input'
});

// Layer 3: Main agent
const agent = new ClineAgent({ /* config */ });

// Combined workflow
async function processWithPreprocessing(userInput: string) {
  // Preprocess with SimpleLLM
  const requirements = await preprocessor.sendMessage(
    `Extract key requirements: ${userInput}`
  );
  
  // Execute with full agent
  return await agent.executeTask(requirements.text);
}
```

### Hybrid Decision System

```typescript
class HybridSystem {
  private simple: SimpleLLM;
  private agent: ClineAgent;
  
  async process(task: string) {
    // Try simple approach first (faster, cheaper)
    const simple = await this.simple.sendMessage(task);
    
    // Check complexity
    const needsAgent = (
      simple.toolCalls?.length > 0 ||
      simple.stopReason !== 'end_turn' ||
      task.includes('complex')
    );
    
    if (!needsAgent) {
      return { type: 'simple', result: simple.text };
    }
    
    // Escalate to full agent
    const agentResult = await this.agent.executeTask(task);
    return { type: 'agent', result: agentResult };
  }
}
```

## Environment Variables

Common environment variables used across layers:

```bash
# API Keys
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key

# API Configuration
API_BASE_URL=https://custom-endpoint.com
API_TIMEOUT=30000
API_MAX_RETRIES=3

# Agent Configuration
MAX_ITERATIONS=25
TEMPERATURE=0.7
MAX_TOKENS=8096

# Orchestrator Configuration
MAX_CONCURRENT_AGENTS=3
WORKFLOW_TIMEOUT=300000

# Debug
DEBUG=true
LOG_LEVEL=debug
```

## Configuration Files

Example configuration file structure:

```typescript
// config.ts
export const config = {
  // Layer 1
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    defaultParams: {
      temperature: 0.7,
      maxTokens: 8096
    },
    retryConfig: {
      maxRetries: 3,
      backoff: 'exponential'
    }
  },
  
  // Layer 2
  conversation: {
    maxMessages: 20,
    summarizeAfter: 10
  },
  
  // Layer 3
  agent: {
    maxIterations: 25,
    systemPrompt: 'You are a helpful assistant',
    tools: ['file', 'command', 'completion']
  },
  
  // Layer 4
  orchestrator: {
    strategy: 'dynamic',
    maxConcurrentAgents: 3
  }
};
```

## Summary

This matrix provides a complete reference for customizing the Cline Framework at any level. Choose the layer that matches your needs, and customize exactly what you need without excess complexity.

For more examples, see:
- [Layered Architecture Guide](./docs/LAYERED_GUIDE.md)
- [Layered Architecture Design](./LAYERED_ARCHITECTURE.md)
- Demo files in `demo/` directory
