#!/usr/bin/env node

/**
 * Demo: Layer 1 - Raw LLM Client
 * 
 * This example shows how to use the raw LLM client for direct API access.
 * Use this when you need complete control over API calls with minimal abstraction.
 */

const { LLMClient } = require('../dist/core/llm-client');

async function main() {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('\nUsage: ANTHROPIC_API_KEY=your-key node demo/layer1-raw-api.js');
    process.exit(1);
  }

  console.log('🔧 Layer 1 Demo: Raw LLM Client\n');
  console.log('This demonstrates direct API access with streaming.\n');

  // Create raw LLM client
  const client = new LLMClient({
    provider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
    
    // Custom default parameters
    defaultParams: {
      temperature: 0.8,
      max_tokens: 2048
    }
  });

  console.log('📡 Streaming response from Claude...\n');

  try {
    // Stream a completion
    let fullText = '';
    let usage = null;

    for await (const chunk of client.streamCompletion({
      system: 'You are a helpful programming assistant. Be concise.',
      messages: [
        {
          role: 'user',
          content: 'Explain what a closure is in JavaScript in 2-3 sentences.'
        }
      ]
    })) {
      if (chunk.type === 'text_delta') {
        process.stdout.write(chunk.text);
        fullText += chunk.text;
      } else if (chunk.type === 'usage') {
        usage = {
          input: chunk.input_tokens,
          output: chunk.output_tokens
        };
      } else if (chunk.type === 'error') {
        throw chunk.error;
      }
    }

    console.log('\n\n✅ Response complete!');
    
    if (usage) {
      console.log(`\n📊 Token usage:`);
      console.log(`   Input: ${usage.input} tokens`);
      console.log(`   Output: ${usage.output} tokens`);
      console.log(`   Total: ${usage.input + usage.output} tokens`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
