/**
 * Demo showing file operations with the Cline Framework
 */

const { ClineAgent } = require('../core/agent');
const { TerminalHost } = require('../host');
const path = require('path');
const fs = require('fs').promises;

async function main() {
  console.log('📁 File Operations Demo\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  // Create a demo directory
  const demoDir = path.join(process.cwd(), 'demo-output');
  await fs.mkdir(demoDir, { recursive: true });

  const host = new TerminalHost({ cwd: demoDir });

  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
    host,
    maxIterations: 15
  });

  // Track tools used
  const toolsUsed = [];
  agent.on('tool_use', (tool) => {
    toolsUsed.push(tool.name);
    console.log(`🔧 ${tool.name}`);
  });

  // Execute file operation tasks
  const tasks = [
    'Create a package.json file for a new Node.js project called "my-app"',
    'Create an index.js file with a simple "Hello World" console.log',
    'List all files in the current directory'
  ];

  for (const task of tasks) {
    console.log(`\n📝 Task: ${task}`);
    console.log('─'.repeat(60));
    
    const result = await agent.executeTask(task, { autoApprove: true });
    
    console.log(`Result: ${result.status}`);
    console.log('─'.repeat(60));
  }

  console.log('\n📊 Summary:');
  console.log(`   Tools used: ${[...new Set(toolsUsed)].join(', ')}`);
  console.log(`   Output directory: ${demoDir}`);
  
  host.dispose();
}

main().catch(console.error);
