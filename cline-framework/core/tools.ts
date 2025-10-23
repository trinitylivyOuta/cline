/**
 * Built-in tool handlers for common operations
 */

import * as path from 'path';
import {
  ToolHandler,
  ToolContext,
  ToolResult,
  ToolParameterSchema
} from '../core/types';

/**
 * Write to file tool
 */
export class WriteToFileTool implements ToolHandler {
  name = 'write_to_file';
  description = 'Write content to a file. Creates the file if it does not exist, or overwrites if it does.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path of the file to write to (relative to working directory)'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file'
      }
    },
    required: ['path', 'content']
  };

  async execute(params: { path: string; content: string }, context: ToolContext): Promise<ToolResult> {
    try {
      await context.host.writeFile(params.path, params.content);
      return {
        status: 'success',
        output: `Successfully wrote to ${params.path}`
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

/**
 * Read file tool
 */
export class ReadFileTool implements ToolHandler {
  name = 'read_file';
  description = 'Read the contents of a file.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path of the file to read (relative to working directory)'
      }
    },
    required: ['path']
  };

  async execute(params: { path: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const content = await context.host.readFile(params.path);
      return {
        status: 'success',
        output: content
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

/**
 * List files tool
 */
export class ListFilesTool implements ToolHandler {
  name = 'list_files';
  description = 'List files in a directory, optionally filtered by a pattern.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list files from'
      },
      pattern: {
        type: 'string',
        description: 'Optional regex pattern to filter files'
      }
    },
    required: ['path']
  };

  async execute(params: { path: string; pattern?: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const files = await context.host.listFiles(params.path, params.pattern);
      return {
        status: 'success',
        output: files.join('\n')
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

/**
 * Execute command tool
 */
export class ExecuteCommandTool implements ToolHandler {
  name = 'execute_command';
  description = 'Execute a shell command in the working directory and return the output.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute'
      }
    },
    required: ['command']
  };

  async execute(params: { command: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const result = await context.host.executeCommand(params.command, context.workingDirectory);
      
      if (result.exitCode === 0) {
        return {
          status: 'success',
          output: result.stdout || '(no output)'
        };
      } else {
        return {
          status: 'error',
          output: result.stdout,
          error: `Command exited with code ${result.exitCode}:\n${result.stderr}`
        };
      }
    } catch (error: any) {
      return {
        status: 'error',
        output: '',
        error: error.message
      };
    }
  }
}

/**
 * Ask user tool
 */
export class AskUserTool implements ToolHandler {
  name = 'ask_followup_question';
  description = 'Ask the user a follow-up question to get more information.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask the user'
      }
    },
    required: ['question']
  };

  async execute(params: { question: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const answer = await context.host.askUser(params.question);
      return {
        status: 'success',
        output: answer
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

/**
 * Attempt completion tool
 */
export class AttemptCompletionTool implements ToolHandler {
  name = 'attempt_completion';
  description = 'Signal that the task is complete and provide a result message.';
  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      result: {
        type: 'string',
        description: 'The result message describing what was accomplished'
      },
      command: {
        type: 'string',
        description: 'Optional command for the user to run to see the results'
      }
    },
    required: ['result']
  };

  async execute(params: { result: string; command?: string }, context: ToolContext): Promise<ToolResult> {
    let output = params.result;
    if (params.command) {
      output += `\n\nTo see the results, run:\n${params.command}`;
    }
    return {
      status: 'success',
      output
    };
  }
}

/**
 * Get all default tools
 */
export function getDefaultTools(): ToolHandler[] {
  return [
    new WriteToFileTool(),
    new ReadFileTool(),
    new ListFilesTool(),
    new ExecuteCommandTool(),
    new AskUserTool(),
    new AttemptCompletionTool()
  ];
}
