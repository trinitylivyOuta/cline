/**
 * Simple demo of the Cline Framework in a terminal environment
 */

const { ClineAgent } = require('../dist/core/agent');
const { TerminalHost } = require('../dist/host');

async function main() {
  console.log('🤖 Cline Framework Demo\n');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('\nTo run this demo:');
    console.log('  export ANTHROPIC_API_KEY=your-key-here');
    console.log('  npm run demo');
    process.exit(1);
  }

  // Create terminal host
  const host = new TerminalHost({
    cwd: process.cwd()
  });

  // Create agent
  console.log('📦 Initializing agent...\n');
  const agent = new ClineAgent({
    apiProvider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
    host,
    maxIterations: 10,
    
    // Event handlers
    onMessage: (message) => {
      if (message.role === 'assistant') {
        const textBlocks = message.content.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
          console.log('\n🤖 Assistant:', textBlocks.map(b => b.text).join('\n'));
        }
      }
    },
    
    onToolUse: async (tool) => {
      console.log(`\n🔧 Tool requested: ${tool.name}`);
      console.log(`   Parameters:`, JSON.stringify(tool.input, null, 2));
      
      // Auto-approve for demo
      return true;
    },
    
    onComplete: (result) => {
      console.log('\n✅ Task completed!');
      console.log(`   Status: ${result.status}`);
      console.log(`   Iterations: ${result.iterations}`);
      if (result.tokensUsed) {
        console.log(`   Tokens: ${result.tokensUsed.total} (${result.tokensUsed.input} in, ${result.tokensUsed.output} out)`);
      }
    }
  });

  // Listen to state changes
  agent.on('state_change', (state) => {
    console.log(`\n📊 State: ${state.status} (iteration ${state.currentIteration})`);
  });

  // Execute a simple task
  const task = process.argv[2] || 'Create a file called hello.txt with the content "Hello from Cline Framework!"';
  
  console.log(`📝 Task: ${task}\n`);
  console.log('─'.repeat(60));

  const result = await agent.executeTask(task, {
    autoApprove: true
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`\n🏁 Final result: ${result.message}\n`);

  // Cleanup
  host.dispose();
}

// Run demo
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
