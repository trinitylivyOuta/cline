/**
 * Host adapter implementations
 */

import { createInterface } from 'readline';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  HostAdapter,
  MessageType,
  CommandResult,
  AskOptions
} from '../core/types';

const execAsync = promisify(exec);

/**
 * Terminal host adapter - for CLI applications
 */
export class TerminalHost implements HostAdapter {
  private cwd: string;
  private readline: any;

  constructor(options: { cwd?: string } = {}) {
    this.cwd = options.cwd || process.cwd();
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async showMessage(message: string, type: MessageType): Promise<void> {
    const prefix = {
      info: '📘',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }[type];
    console.log(`${prefix} ${message}`);
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    const fullPath = path.isAbsolute(directory) ? directory : path.join(this.cwd, directory);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    let files = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(directory, entry.name));

    if (pattern) {
      const regex = new RegExp(pattern);
      files = files.filter(file => regex.test(file));
    }

    return files;
  }

  async executeCommand(command: string, workingDir?: string): Promise<CommandResult> {
    const dir = workingDir || this.cwd;
    console.log(`🔧 Executing: ${command}`);
    console.log(`   Working directory: ${dir}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: dir,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 5 * 60 * 1000, // 5 minutes
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      return {
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || ''
      };
    } catch (error: any) {
      const exitCode = error.code || 1;
      const stdout = error.stdout || '';
      const stderr = error.stderr || error.message;
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      return {
        exitCode,
        stdout,
        stderr
      };
    }
  }

  getCurrentDirectory(): string {
    return this.cwd;
  }

  setCurrentDirectory(newPath: string): void {
    this.cwd = path.resolve(newPath);
  }

  async askUser(question: string, options?: AskOptions): Promise<string> {
    return new Promise((resolve) => {
      const prompt = options?.choices
        ? `${question} (${options.choices.join('/')}) `
        : `${question} `;
        
      this.readline.question(prompt, (answer: string) => {
        resolve(answer.trim() || options?.defaultValue || '');
      });
    });
  }

  async openUrl(url: string): Promise<void> {
    console.log(`🌐 Opening URL: ${url}`);
    // In a real implementation, you might use 'open' package
    // For now, just log it
  }

  async getDiff(original: string, modified: string): Promise<string> {
    // Simple line-by-line diff
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const diff: string[] = [];

    const maxLen = Math.max(origLines.length, modLines.length);
    for (let i = 0; i < maxLen; i++) {
      const origLine = origLines[i];
      const modLine = modLines[i];
      
      if (origLine !== modLine) {
        if (origLine !== undefined) {
          diff.push(`- ${origLine}`);
        }
        if (modLine !== undefined) {
          diff.push(`+ ${modLine}`);
        }
      }
    }

    return diff.join('\n');
  }

  dispose(): void {
    this.readline.close();
  }
}

/**
 * Mock host adapter - for testing
 */
export class MockHost implements HostAdapter {
  private cwd: string;
  private files: Map<string, string>;
  private messages: Array<{ message: string; type: MessageType }>;
  private commands: Array<{ command: string; result: CommandResult }>;

  constructor(options: { cwd?: string; files?: Record<string, string> } = {}) {
    this.cwd = options.cwd || '/mock';
    this.files = new Map(Object.entries(options.files || {}));
    this.messages = [];
    this.commands = [];
  }

  async showMessage(message: string, type: MessageType): Promise<void> {
    this.messages.push({ message, type });
  }

  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    let files = Array.from(this.files.keys()).filter(f => 
      f.startsWith(directory)
    );

    if (pattern) {
      const regex = new RegExp(pattern);
      files = files.filter(file => regex.test(file));
    }

    return files;
  }

  async executeCommand(command: string, workingDir?: string): Promise<CommandResult> {
    const result: CommandResult = {
      exitCode: 0,
      stdout: `Executed: ${command}`,
      stderr: ''
    };
    this.commands.push({ command, result });
    return result;
  }

  getCurrentDirectory(): string {
    return this.cwd;
  }

  setCurrentDirectory(path: string): void {
    this.cwd = path;
  }

  async askUser(question: string, options?: AskOptions): Promise<string> {
    return options?.defaultValue || 'yes';
  }

  // Test helpers
  getMessages() {
    return this.messages;
  }

  getCommands() {
    return this.commands;
  }

  getFiles() {
    return Object.fromEntries(this.files);
  }
}
