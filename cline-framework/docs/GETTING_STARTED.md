# Getting Started with Cline Framework

A step-by-step tutorial to get you up and running with the Cline Framework in 15 minutes.

## Table of Contents

1. [Installation](#installation)
2. [Your First Agent](#your-first-agent)
3. [Understanding the Code](#understanding-the-code)
4. [Adding Custom Tools](#adding-custom-tools)
5. [Handling Events](#handling-events)
6. [Next Steps](#next-steps)

---

## Installation

### Step 1: Create a New Project

```bash
mkdir my-cline-agent
cd my-cline-agent
npm init -y
```

### Step 2: Install the Framework

```bash
npm install @cline/framework
```

### Step 3: Install Dependencies (if using the local version)

```bash
# If you're using the framework from this repository
cd cline-framework
npm install
npm run build
cd ..
```

### Step 4: Set Up TypeScript (Optional but Recommended)

```bash
npm install --save-dev typescript @types/node
npx tsc --init
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

---

## Your First Agent

### Step 1: Get an API Key

You'll need an API key from one of the supported providers:

- **Anthropic**: Visit [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Visit [platform.openai.com](https://platform.openai.com)

Set it as an environment variable:

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

Or create a `.env` file:
```
ANTHROPIC_API_KEY=your-key-here
```

### Step 2: Create Your First Agent

Create `index.js`:

```javascript
const { ClineAgent } = require('@cline/framework');
const { TerminalHost } = require('@cline/framework/host');

async function main() {
  // Create the host (handles file operations, commands)
  const host = new TerminalHost({
    cwd: process.cwd()
  });

  // Create the agent
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    host
  });

  // Execute a task
  console.log('🤖 Starting task...\n');
  
  const result = await agent.executeTask(
    'Create a file called hello.txt with the message "Hello from Cline Framework!"'
  );

  // Check the result
  console.log('\n✅ Task completed!');
  console.log('Status:', result.status);
  console.log('Message:', result.message);
  console.log('Iterations:', result.iterations);
  
  if (result.tokensUsed) {
    console.log('Tokens used:', result.tokensUsed.total);
  }
}

main().catch(console.error);
```

### Step 3: Run It!

```bash
node index.js
```

You should see:
```
🤖 Starting task...

✅ Task completed!
Status: completed
Message: Task completed successfully
Iterations: 2
Tokens used: 1234
```

And a `hello.txt` file will be created with the message!

---

## Understanding the Code

Let's break down what just happened:

### 1. The Host

```javascript
const host = new TerminalHost({
  cwd: process.cwd()
});
```

The **TerminalHost** provides the agent with:
- File system access (read, write, list)
- Command execution capability
- User interaction (prompts)

Think of it as the agent's "hands" in your environment.

### 2. The Agent

```javascript
const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host
});
```

The **ClineAgent** is the brain that:
- Communicates with the LLM
- Decides which tools to use
- Executes tasks autonomously

### 3. Task Execution

```javascript
const result = await agent.executeTask('...');
```

When you call `executeTask()`:
1. The agent sends your request to the LLM
2. The LLM decides what tools to use
3. The agent executes those tools
4. The agent sends results back to the LLM
5. This continues until the task is complete

---

## Adding Custom Tools

Let's create a custom tool that the agent can use.

### Example: HTTP Request Tool

Create `http-tool.js`:

```javascript
class HttpRequestTool {
  name = 'http_request';
  description = 'Make an HTTP GET request to a URL and return the response';
  
  parameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to request'
      }
    },
    required: ['url']
  };
  
  async execute(params, context) {
    try {
      const response = await fetch(params.url);
      const text = await response.text();
      
      return {
        status: 'success',
        output: `Status: ${response.status}\n\n${text.substring(0, 500)}...`
      };
    } catch (error) {
      return {
        status: 'error',
        output: '',
        error: error.message
      };
    }
  }
}

module.exports = { HttpRequestTool };
```

### Use Your Custom Tool

Update `index.js`:

```javascript
const { ClineAgent, getDefaultTools } = require('@cline/framework');
const { TerminalHost } = require('@cline/framework/host');
const { HttpRequestTool } = require('./http-tool');

async function main() {
  const host = new TerminalHost();
  
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    host,
    
    // Add your custom tool!
    tools: [
      ...getDefaultTools(),
      new HttpRequestTool()
    ]
  });

  const result = await agent.executeTask(
    'Fetch https://api.github.com and save the response to github-api.json'
  );

  console.log('Result:', result.status);
}

main().catch(console.error);
```

Now the agent can make HTTP requests!

---

## Handling Events

Monitor what the agent is doing in real-time:

```javascript
const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost(),
  
  // Callback when agent wants to use a tool
  onToolUse: async (tool) => {
    console.log(`🔧 Agent wants to use: ${tool.name}`);
    console.log(`   Parameters:`, JSON.stringify(tool.input, null, 2));
    
    // You can approve or reject
    return true; // Approve all
  },
  
  // Callback when task completes
  onComplete: (result) => {
    console.log(`✅ Task finished: ${result.status}`);
  }
});

// Listen to events
agent.on('state_change', (state) => {
  console.log(`📊 State: ${state.status} (iteration ${state.currentIteration})`);
});

agent.on('message', (message) => {
  if (message.role === 'assistant') {
    const textBlocks = message.content.filter(b => b.type === 'text');
    if (textBlocks.length > 0) {
      console.log(`🤖 Agent says: ${textBlocks[0].text.substring(0, 100)}...`);
    }
  }
});

await agent.executeTask('Your task here');
```

This gives you full visibility into the agent's operation!

---

## Complete Example: File Organizer

Let's build a complete application that organizes files.

### `file-organizer.js`

```javascript
const { ClineAgent } = require('@cline/framework');
const { TerminalHost } = require('@cline/framework/host');

async function organizeFiles(directory) {
  console.log(`📁 Organizing files in ${directory}...\n`);
  
  const host = new TerminalHost({ cwd: directory });
  
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    host,
    
    onToolUse: async (tool) => {
      // Log what's happening
      console.log(`   → ${tool.name}: ${JSON.stringify(tool.input).substring(0, 60)}...`);
      return true;
    }
  });

  const result = await agent.executeTask(`
    Analyze all files in the current directory and organize them by type:
    - Create folders: images/, documents/, code/, other/
    - Move files to appropriate folders based on extension
    - Create a summary report in ORGANIZATION_REPORT.md
  `);

  console.log(`\n✅ Organization complete!`);
  console.log(`Status: ${result.status}`);
  console.log(`Iterations: ${result.iterations}`);
  
  if (result.tokensUsed) {
    console.log(`Tokens: ${result.tokensUsed.total}`);
  }
}

// Run it
const targetDir = process.argv[2] || './test-files';
organizeFiles(targetDir).catch(console.error);
```

### Run It:

```bash
node file-organizer.js ./my-messy-folder
```

The agent will autonomously organize your files!

---

## Testing Without an API Key

You can test the framework without making API calls:

```javascript
const { ClineAgent } = require('@cline/framework');
const { MockHost } = require('@cline/framework/host');

// Create a mock host with virtual files
const host = new MockHost({
  cwd: '/virtual',
  files: {
    '/virtual/test.txt': 'Hello World'
  }
});

// Create agent (it won't make API calls in tests)
const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: 'test-key', // Fake key for testing
  model: 'test-model',
  host
});

// Test that it was created
console.log('Agent created:', agent.getState().status); // 'idle'

// Check mock host operations
console.log('Files:', host.getFiles());
```

---

## Next Steps

Now that you've built your first agent, here's what to explore next:

### 1. Learn More

- **[Complete Usage Guide](./USAGE_GUIDE.md)** - Comprehensive guide with advanced examples
- **[API Reference](./API.md)** - Detailed API documentation
- **[Custom Tools Guide](./CUSTOM_TOOLS.md)** - Build powerful custom tools

### 2. Try the Examples

Explore the demo applications:

```bash
cd cline-framework/demo

# Simple agent
node simple-agent.js

# File operations
node file-operations.js

# Custom host
node custom-host.js
```

### 3. Build Something!

Ideas to get started:
- **Code Generator**: "Create a REST API for a todo app"
- **Documentation Writer**: "Generate API docs from this code"
- **Test Generator**: "Write tests for all functions in this file"
- **Project Initializer**: "Set up a new React app with TypeScript"
- **Code Reviewer**: "Review this code and suggest improvements"

### 4. Advanced Features

- Add custom API providers
- Implement a VSCode extension host
- Build multi-agent systems
- Create specialized tools for your domain

---

## Common Issues

### Issue: "API key not found"

**Solution**: Set the environment variable

```bash
export ANTHROPIC_API_KEY="your-key"
```

Or in code:
```javascript
const agent = new ClineAgent({
  apiKey: 'your-key-here', // Not recommended for production
  // ...
});
```

### Issue: "Cannot find module"

**Solution**: Build the framework first

```bash
cd cline-framework
npm install
npm run build
```

### Issue: "Agent gets stuck"

**Solution**: Set max iterations

```javascript
const agent = new ClineAgent({
  maxIterations: 10, // Stop after 10 attempts
  // ...
});
```

---

## Resources

- **Documentation**: `/cline-framework/docs/`
- **Examples**: `/cline-framework/demo/`
- **Tests**: `/cline-framework/test/`
- **Source Code**: `/cline-framework/core/`

---

## Get Help

- Check the [Troubleshooting Guide](./USAGE_GUIDE.md#troubleshooting)
- Review the [examples](../demo/)
- Read the [architecture docs](../ARCHITECTURE.md)

---

**Congratulations!** 🎉 You've built your first autonomous AI agent with the Cline Framework.

Happy building!
