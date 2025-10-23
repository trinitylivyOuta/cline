#!/usr/bin/env node

/**
 * Demo: Layer 2 - Simple LLM Application
 * 
 * This example shows single request-response pattern with conversation management.
 * Use this for chatbots, Q&A systems, and single-turn tool calling.
 */

const { SimpleLLM } = require('../dist/core/simple-llm');

async function main() {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('\nUsage: ANTHROPIC_API_KEY=your-key node demo/layer2-simple-app.js');
    process.exit(1);
  }

  console.log('💬 Layer 2 Demo: Simple LLM Application\n');
  console.log('This demonstrates conversation management and tool calling.\n');

  // Create simple LLM application
  const app = new SimpleLLM({
    provider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a helpful math tutor. Explain concepts clearly.',
    conversationConfig: {
      maxMessages: 10,
      includeSystem: true
    }
  });

  // Add a simple calculation tool
  app.addTool({
    name: 'calculate',
    description: 'Perform a mathematical calculation',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")'
        }
      },
      required: ['expression']
    },
    execute: async (params) => {
      try {
        // Safe evaluation (in production, use a proper math library)
        const result = eval(params.expression.replace(/sqrt/g, 'Math.sqrt'));
        return {
          status: 'success',
          output: `Result: ${result}`
        };
      } catch (error) {
        return {
          status: 'error',
          output: '',
          error: 'Invalid expression'
        };
      }
    }
  });

  console.log('🧮 Conversation 1: Simple question\n');

  try {
    // First message
    const response1 = await app.sendMessage(
      'What is a prime number?',
      {
        onStream: (text) => process.stdout.write(text)
      }
    );

    console.log('\n');

    // Second message with streaming
    console.log('\n🧮 Conversation 2: Follow-up question\n');
    
    const response2 = await app.sendMessage(
      'Give me 3 examples of prime numbers',
      {
        onStream: (text) => process.stdout.write(text)
      }
    );

    console.log('\n');

    // Get conversation stats
    const stats = app.getStats();
    console.log('\n📊 Conversation Statistics:');
    console.log(`   Total messages: ${stats.messageCount}`);
    console.log(`   User messages: ${stats.userMessages}`);
    console.log(`   Assistant messages: ${stats.assistantMessages}`);
    console.log(`   Tools registered: ${stats.toolsRegistered}`);

    // Export conversation
    console.log('\n💾 Conversation can be exported/imported:');
    const exported = app.exportConversation();
    console.log(`   Exported size: ${exported.length} characters`);

    console.log('\n✅ Demo complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
