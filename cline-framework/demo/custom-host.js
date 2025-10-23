/**
 * Demo showing how to create a custom host adapter
 */

const { ClineAgent } = require('../core/agent');

/**
 * Custom host that logs all operations
 */
class LoggingHost {
  constructor() {
    this.cwd = process.cwd();
    this.operations = [];
  }

  log(operation, details) {
    const entry = { operation, details, timestamp: new Date() };
    this.operations.push(entry);
    console.log(`[${operation}]`, details);
  }

  async showMessage(message, type) {
    this.log('showMessage', { message, type });
  }

  async readFile(path) {
    this.log('readFile', { path });
    return `Mock content of ${path}`;
  }

  async writeFile(path, content) {
    this.log('writeFile', { path, length: content.length });
  }

  async fileExists(path) {
    this.log('fileExists', { path });
    return false;
  }

  async listFiles(directory, pattern) {
    this.log('listFiles', { directory, pattern });
    return ['file1.txt', 'file2.js'];
  }

  async executeCommand(command, workingDir) {
    this.log('executeCommand', { command, workingDir });
    return {
      exitCode: 0,
      stdout: `Mock output for: ${command}`,
      stderr: ''
    };
  }

  getCurrentDirectory() {
    return this.cwd;
  }

  setCurrentDirectory(path) {
    this.cwd = path;
    this.log('setCurrentDirectory', { path });
  }

  async askUser(question, options) {
    this.log('askUser', { question, options });
    return 'yes';
  }

  getOperationLog() {
    return this.operations;
  }
}

async function main() {
  console.log('🎨 Custom Host Demo\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const host = new LoggingHost();

  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
    host,
    maxIterations: 5
  });

  const task = 'Create a README.md file and then list all files';
  console.log(`Task: ${task}\n`);

  const result = await agent.executeTask(task, { autoApprove: true });

  console.log(`\n✅ Task ${result.status}`);
  console.log(`\n📋 Operations performed:`);
  
  const log = host.getOperationLog();
  log.forEach((entry, i) => {
    console.log(`  ${i + 1}. ${entry.operation}:`, entry.details);
  });
}

main().catch(console.error);
