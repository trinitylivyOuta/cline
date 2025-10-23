# Creating Custom Tools

Custom tools extend the agent's capabilities with domain-specific functionality.

## Basic Tool Structure

```typescript
import { ToolHandler, ToolContext, ToolResult } from '@cline/framework';

class MyTool implements ToolHandler {
  name = 'my_tool';
  description = 'What this tool does';
  
  parameters = {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  };
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      // Tool logic here
      return {
        status: 'success',
        output: 'Result'
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
```

## Using Context

The `ToolContext` provides:
- `host` - Host adapter for file/command operations
- `workingDirectory` - Current working directory
- `conversation` - Message history
- `taskId` - Unique task identifier

## Example Tools

See the framework source code for examples:
- `WriteToFileTool` - File operations
- `ExecuteCommandTool` - Command execution
- `AskUserTool` - User interaction

## Registration

```typescript
const agent = new ClineAgent({
  // ... config
  tools: [
    ...getDefaultTools(),
    new MyTool()
  ]
});
```
