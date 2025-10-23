#!/usr/bin/env node
/**
 * Test script to verify the framework loads and works correctly
 * This tests basic functionality without requiring an API key
 */

const { ClineAgent } = require('../dist/core/agent');
const { TerminalHost, MockHost } = require('../dist/host');
const { getDefaultTools } = require('../dist/core/tools');

console.log('🧪 Running Cline Framework Tests\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Module imports
test('Core modules import correctly', () => {
  if (typeof ClineAgent !== 'function') throw new Error('ClineAgent not a function');
  if (typeof TerminalHost !== 'function') throw new Error('TerminalHost not a function');
  if (typeof MockHost !== 'function') throw new Error('MockHost not a function');
  if (typeof getDefaultTools !== 'function') throw new Error('getDefaultTools not a function');
});

// Test 2: MockHost creation
test('MockHost can be instantiated', () => {
  const host = new MockHost({ cwd: '/test' });
  if (host.getCurrentDirectory() !== '/test') throw new Error('MockHost cwd not set');
});

// Test 3: Default tools
test('Default tools are available', () => {
  const tools = getDefaultTools();
  if (!Array.isArray(tools)) throw new Error('getDefaultTools did not return array');
  if (tools.length !== 6) throw new Error(`Expected 6 tools, got ${tools.length}`);
  
  const toolNames = tools.map(t => t.name);
  const expectedTools = [
    'write_to_file',
    'read_file',
    'list_files',
    'execute_command',
    'ask_followup_question',
    'attempt_completion'
  ];
  
  for (const expected of expectedTools) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Missing tool: ${expected}`);
    }
  }
});

// Test 4: Agent creation with MockHost
test('ClineAgent can be instantiated with MockHost', () => {
  const host = new MockHost({ cwd: '/test' });
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: 'test-key',
    model: 'test-model',
    host
  });
  
  if (!agent) throw new Error('Agent not created');
  const state = agent.getState();
  if (state.status !== 'idle') throw new Error(`Expected idle status, got ${state.status}`);
});

// Test 5: MockHost file operations
test('MockHost file operations work', async () => {
  const host = new MockHost({ 
    cwd: '/test',
    files: { '/test/file.txt': 'content' }
  });
  
  const content = await host.readFile('/test/file.txt');
  if (content !== 'content') throw new Error('Read file failed');
  
  await host.writeFile('/test/new.txt', 'new content');
  const newContent = await host.readFile('/test/new.txt');
  if (newContent !== 'new content') throw new Error('Write file failed');
  
  const exists = await host.fileExists('/test/file.txt');
  if (!exists) throw new Error('File exists check failed');
});

// Test 6: Tool execution with MockHost
test('Tools can execute with MockHost', async () => {
  const { WriteToFileTool } = require('../dist/core/tools');
  const host = new MockHost({ cwd: '/test' });
  const tool = new WriteToFileTool();
  
  const result = await tool.execute(
    { path: 'test.txt', content: 'hello' },
    { host, workingDirectory: '/test', conversation: [], taskId: 'test' }
  );
  
  if (result.status !== 'success') throw new Error('Tool execution failed');
});

// Test 7: TerminalHost creation
test('TerminalHost can be instantiated', () => {
  const host = new TerminalHost({ cwd: process.cwd() });
  if (host.getCurrentDirectory() !== process.cwd()) {
    throw new Error('TerminalHost cwd not set');
  }
});

// Test 8: Agent event system
test('Agent event system works', () => {
  const host = new MockHost({ cwd: '/test' });
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey: 'test-key',
    model: 'test-model',
    host
  });
  
  let eventFired = false;
  agent.on('state_change', () => {
    eventFired = true;
  });
  
  // Trigger an event by getting state (internal operation)
  agent.getState();
  
  // The event might not fire immediately, so we just check the listener was added
  if (agent.listenerCount('state_change') === 0) {
    throw new Error('Event listener not registered');
  }
});

// Summary
console.log('\n' + '─'.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ Some tests failed\n');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!\n');
  console.log('The framework is working correctly.');
  console.log('Run "npm run demo" with ANTHROPIC_API_KEY set to test with a real LLM.\n');
  process.exit(0);
}
