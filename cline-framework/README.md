# Cline Framework

A lightweight, reusable agent framework extracted from [Cline](https://github.com/cline/cline) that enables building AI agents that can execute in both VSCode extensions and standalone terminal applications.

## ⭐ NEW: Layered Architecture

The framework now provides **4 layers of abstraction**, allowing you to choose the right level of complexity:

| Layer | What | Use When |
|-------|------|----------|
| **Layer 1** | **LLMClient** - Raw API access | You need direct API control |
| **Layer 2** | **SimpleLLM** - Request-response | Building chatbots, Q&A systems |
| **Layer 3** | **ClineAgent** - Agentic loop | Need autonomous task execution |
| **Layer 4** | **AgentOrchestrator** - Multi-agent | Coordinating specialized agents |

See [Layered Architecture Guide](./docs/LAYERED_GUIDE.md) for details and examples.

## ✨ Features

- 🎯 **Layered Architecture**: Use what you need - from raw APIs to multi-agent orchestration
- 🤖 **Unified Agent Interface**: Single API for creating conversational AI agents
- 🔌 **Multi-Provider Support**: Works with Anthropic Claude, OpenAI GPT, and more
- 🛠️ **Extensible Tool System**: Built-in tools for file operations, commands, and user interaction
- 🖥️ **Hybrid Execution**: Run in VSCode or standalone terminal environments
- 🔧 **Host Abstraction**: Clean separation between agent logic and environment
- 📦 **Minimal Dependencies**: Lightweight core (40KB) with only 4 production dependencies
- ✅ **Fully Tested**: 8 automated tests, TypeScript compilation verified
- 📚 **Comprehensive Docs**: 70,000+ words of documentation and guides

## 📦 Installation

```bash
npm install @cline/framework
```

## 🚀 Quick Start

### 1. Get an API Key

Get an API key from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com).

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### 2. Create Your First Agent

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost({
    cwd: process.cwd()
  })
});

// Execute a task
const result = await agent.executeTask(
  'Create a hello.txt file with a greeting message'
);

console.log('Task completed:', result.status);
```

### 3. Run It!

```bash
node your-agent.js
```

That's it! The agent will autonomously create the file using the LLM and built-in tools.

## 🏗️ Using Different Layers

### Layer 1: Direct API Access

For maximum control and minimal overhead:

```typescript
import { LLMClient } from '@cline/framework';

const client = new LLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// Stream response
for await (const chunk of client.streamCompletion({
  messages: [{ role: 'user', content: 'Hello!' }]
})) {
  if (chunk.type === 'text_delta') {
    process.stdout.write(chunk.text);
  }
}
```

### Layer 2: Simple Chatbot

For conversation management without autonomy:

```typescript
import { SimpleLLM } from '@cline/framework';

const app = new SimpleLLM({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: 'You are a helpful assistant.'
});

// Conversation is managed automatically
const response1 = await app.sendMessage('What is TypeScript?');
const response2 = await app.sendMessage('Give me an example');
```

### Layer 3: Autonomous Agent

For iterative task execution (shown in Quick Start above):

```typescript
import { ClineAgent } from '@cline/framework';
import { TerminalHost } from '@cline/framework/host';

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost()
});

// Agent iterates until task complete
const result = await agent.executeTask('Create a Node.js server');
```

### Layer 4: Multi-Agent Orchestration

For coordinating specialized agents:

```typescript
import { AgentOrchestrator } from '@cline/framework';

const orchestrator = new AgentOrchestrator();

// Create specialized agents
const coder = orchestrator.createAgent({ name: 'coder', /* config */ });
const reviewer = orchestrator.createAgent({ name: 'reviewer', /* config */ });

// Define workflow
const workflow = orchestrator.createWorkflow({
  name: 'Development Pipeline',
  steps: [
    { id: 'code', agent: 'coder', task: 'Implement {{input}}' },
    { id: 'review', agent: 'reviewer', task: 'Review code', dependsOn: ['code'] }
  ]
});

// Execute
const result = await orchestrator.execute(workflow, 'user authentication');
```

## 📚 Documentation

### Getting Started
- **[Getting Started Tutorial](./docs/GETTING_STARTED.md)** ⭐ - Step-by-step guide (15 minutes)
- **[Layered Architecture Guide](./docs/LAYERED_GUIDE.md)** ⭐ NEW - Choose the right layer
- **[Complete Usage Guide](./docs/USAGE_GUIDE.md)** - Comprehensive guide with examples
- **[Quick Start](#quick-start)** - Get running in 5 minutes

### Core Documentation
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Architecture Guide](./ARCHITECTURE.md)** - Visual architecture overview
- **[Layered Architecture](./LAYERED_ARCHITECTURE.md)** ⭐ NEW - Deep dive into layers
- **[Custom Tools Guide](./docs/CUSTOM_TOOLS.md)** - Build your own tools

### Testing & Validation
- **[Testing Guide](./test/README.md)** - How to test the framework
- **[Testing Validation](./TESTING_VALIDATION.md)** - Test results and coverage

### Planning & Roadmap
- **[Gaps & Roadmap](./GAPS_AND_ROADMAP.md)** - Current gaps and future plans
- **[Project Summary](../PROJECT_SUMMARY.md)** - Executive overview
- **[Architecture Analysis](../ARCHITECTURE_ANALYSIS.md)** - Deep technical analysis

## 🎯 What Can You Build?

### Code Generation
```typescript
const result = await agent.executeTask(
  'Create a REST API client for GitHub with TypeScript'
);
```

### File Operations
```typescript
const result = await agent.executeTask(
  'Organize all files in this directory by type'
);
```

### Project Setup
```typescript
const result = await agent.executeTask(
  'Set up a new React app with TypeScript and Tailwind'
);
```

### Code Analysis
```typescript
const result = await agent.executeTask(
  'Analyze all TypeScript files and create a dependency graph'
);
```

## 🛠️ Built-in Tools

The framework includes 6 essential tools:

1. **write_to_file** - Create or modify files
2. **read_file** - Read file contents
3. **list_files** - List directory contents
4. **execute_command** - Run shell commands
5. **ask_followup_question** - Interactive questions
6. **attempt_completion** - Signal task completion

## 🔌 Custom Tools

Create your own tools easily:

```typescript
import { ToolHandler, ToolResult } from '@cline/framework';

class CustomTool implements ToolHandler {
  name = 'custom_tool';
  description = 'My custom tool';
  
  parameters = {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Tool input' }
    },
    required: ['input']
  };
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Your tool logic here
    return {
      status: 'success',
      output: 'Tool executed successfully'
    };
  }
}

// Add to agent
import { getDefaultTools } from '@cline/framework';

const agent = new ClineAgent({
  // ... config
  tools: [...getDefaultTools(), new CustomTool()]
});
```

See [Custom Tools Guide](./docs/CUSTOM_TOOLS.md) for detailed examples.

## 🧪 Testing

Run the test suite (no API key required):

```bash
cd cline-framework
npm install
npm test
```

Expected output:
```
✅ All tests passed!
📊 Test Results: 8 passed, 0 failed
```

Test with a real LLM:
```bash
export ANTHROPIC_API_KEY=your-key
npm run demo
```

## 🏗️ Architecture

```
User Application
      ↓
ClineAgent (Core Engine)
      ↓
┌─────┴─────┬──────────┬───────────┐
│           │          │           │
API       Host      Tools      State
Provider  Adapter   System   Management
```

The framework uses a clean layered architecture:
- **Agent Layer**: Orchestrates task execution
- **Provider Layer**: Abstracts LLM APIs
- **Host Layer**: Abstracts environment operations
- **Tool Layer**: Extensible capability system

## 📊 Comparison

| Feature | Cline Framework | Full Cline |
|---------|----------------|------------|
| Size | 40KB | 6.5MB |
| Files | 23 | 652 |
| Dependencies | 4 | 100+ |
| VSCode Extension | ❌ | ✅ |
| CLI Support | ✅ | ✅ |
| LLM Providers | 2+ | 30+ |
| Complexity | Low | High |
| Learning Curve | Gentle | Steep |
| Use Case | Build agents | Full IDE |

## 🚀 Examples

### File Organizer

```typescript
const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost()
});

await agent.executeTask(`
  Organize files in the current directory:
  - Create folders by file type
  - Move files accordingly
  - Create a summary report
`);
```

### Code Generator

```typescript
await agent.executeTask(
  'Create a complete REST API with CRUD operations for a blog'
);
```

### Interactive Assistant

```typescript
agent.on('tool_use', async (tool) => {
  if (tool.name === 'ask_followup_question') {
    console.log('Agent asks:', tool.input.question);
  }
  return true;
});

await agent.executeTask('Help me set up a new project');
```

See [demo/](./demo/) for complete working examples.

## 🎓 Learning Resources

### Tutorials
1. [Getting Started (15 min)](./docs/GETTING_STARTED.md) - Build your first agent
2. [Usage Guide](./docs/USAGE_GUIDE.md) - Comprehensive examples
3. [Custom Tools](./docs/CUSTOM_TOOLS.md) - Extend capabilities

### Reference
- [API Reference](./docs/API.md) - Complete API docs
- [Architecture](./ARCHITECTURE.md) - System design
- [Testing Guide](./test/README.md) - How to test

### Examples
- [Simple Agent](./demo/simple-agent.js) - Basic usage
- [File Operations](./demo/file-operations.js) - File manipulation
- [Custom Host](./demo/custom-host.js) - Custom environment

## 🛣️ Roadmap

### Current (v0.1.0)
- ✅ Core agent framework
- ✅ 2 API providers (Anthropic, OpenAI)
- ✅ 6 built-in tools
- ✅ Comprehensive documentation (70K+ words)
- ✅ 8 automated tests

### Next (v0.2.0)
- [ ] Enhanced error handling
- [ ] More API providers (OpenRouter, Gemini)
- [ ] Context window management
- [ ] 50+ tests
- [ ] Performance optimization

### Future (v1.0.0)
- [ ] Browser automation
- [ ] MCP integration
- [ ] VSCode host adapter
- [ ] Plugin system
- [ ] Community ecosystem

See [GAPS_AND_ROADMAP.md](./GAPS_AND_ROADMAP.md) for details.

## 📈 Project Stats

- **Code**: 1,500 lines TypeScript
- **Tests**: 8 tests, 100% passing
- **Documentation**: 70,000+ words
- **Examples**: 3 working demos
- **Size**: 40KB (99% smaller than original)
- **Dependencies**: 4 production packages

## 🤝 Contributing

Contributions welcome! See opportunities in [GAPS_AND_ROADMAP.md](./GAPS_AND_ROADMAP.md).

### Easy Contributions
- Add examples to documentation
- Create demo applications
- Improve error messages
- Add JSDoc comments

### Medium Contributions
- Implement new API providers
- Add more built-in tools
- Improve test coverage
- Create tutorials

## 📝 License

Apache-2.0 © 2025 Cline Framework Contributors

## 🙏 Credits

Extracted from the excellent [Cline](https://github.com/cline/cline) project by Cline Bot Inc.

## 📞 Support

- **Documentation**: Check the [docs](./docs/) directory
- **Examples**: See [demo](./demo/) applications  
- **Issues**: Open an issue on GitHub
- **Discussions**: Join community discussions

---

**Ready to build?** Start with the [Getting Started Tutorial](./docs/GETTING_STARTED.md) →

## Architecture

The framework is organized into modular packages:

- `@cline/framework/core` - Agent execution engine and core logic
- `@cline/framework/host` - Host abstractions for different environments
- `@cline/framework/services` - Optional services (MCP, browser, etc.)

## Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Examples](./demo/)
- [Creating Custom Tools](./docs/CUSTOM_TOOLS.md)

## Comparison with Full Cline

| Feature | Cline Framework | Full Cline |
|---------|----------------|------------|
| Size | ~50-100 files | 652 files |
| VSCode Extension | ❌ | ✅ |
| CLI Support | ✅ | ✅ |
| LLM Providers | Core providers | 30+ providers |
| UI | Host-provided | Full webview |
| MCP Support | Optional | Built-in |
| Browser Automation | Optional | Built-in |

## Examples

See the [demo/](./demo/) directory for complete examples:

- `simple-agent.js` - Basic terminal agent
- `file-operations.js` - Agent with file tools
- `custom-host.js` - Implementing a custom host
- `with-mcp.js` - Using MCP servers

## Development

```bash
# Build the framework
npm run build

# Watch mode
npm run watch

# Run demo
npm run demo
```

## License

Apache-2.0 © 2025 Cline Framework Contributors

## Credits

This framework is extracted from the excellent [Cline](https://github.com/cline/cline) project by Cline Bot Inc.
