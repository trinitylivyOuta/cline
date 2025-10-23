# Cline Framework

A lightweight, reusable agent framework extracted from [Cline](https://github.com/cline/cline) that enables building AI agents that can execute in both VSCode extensions and standalone terminal applications.

## Features

- 🤖 **Unified Agent Interface**: Single API for creating conversational AI agents
- 🔌 **Multi-Provider Support**: Works with Anthropic, OpenAI, OpenRouter, and more
- 🛠️ **Extensible Tool System**: Built-in tools for file operations, commands, and web browsing
- 🖥️ **Hybrid Execution**: Run in VSCode or standalone terminal environments
- 🔧 **Host Abstraction**: Clean separation between agent logic and environment
- 📦 **Minimal Dependencies**: Lightweight core with optional services

## Installation

```bash
npm install @cline/framework
```

## Quick Start

### Terminal Agent

```typescript
import { ClineAgent, TerminalHost } from '@cline/framework';

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
  'Create a simple Node.js HTTP server in server.js'
);

console.log('Task completed:', result.status);
```

### Custom Tool

```typescript
import { ToolHandler, ToolResult } from '@cline/framework';

class CustomTool implements ToolHandler {
  name = 'custom_tool';
  description = 'My custom tool';
  
  async execute(params: any): Promise<ToolResult> {
    // Your tool logic
    return {
      status: 'success',
      output: 'Tool executed successfully'
    };
  }
}

const agent = new ClineAgent({
  // ... config
  tools: [new CustomTool()]
});
```

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
