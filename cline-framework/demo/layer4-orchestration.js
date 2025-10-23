#!/usr/bin/env node

/**
 * Demo: Layer 4 - Agent Orchestration
 * 
 * This example shows multi-agent coordination with workflows.
 * Use this for coordinating multiple agents and complex workflows.
 */

const { AgentOrchestrator, ClineAgent } = require('../dist/core');
const { TerminalHost, MockHost } = require('../dist/host');

async function main() {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('\nUsage: ANTHROPIC_API_KEY=your-key node demo/layer4-orchestration.js');
    process.exit(1);
  }

  console.log('🎭 Layer 4 Demo: Agent Orchestration\n');
  console.log('This demonstrates multi-agent coordination with workflows.\n');

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    strategy: 'dynamic', // Execute based on dependencies
    maxConcurrentAgents: 2
  });

  // Listen to orchestration events
  orchestrator.on('workflow:start', (id, name) => {
    console.log(`\n🚀 Workflow started: ${name} (${id})`);
  });

  orchestrator.on('step:start', (stepId, agent) => {
    console.log(`\n   📍 Step ${stepId}: Agent '${agent}' starting...`);
  });

  orchestrator.on('step:complete', (stepId, result) => {
    console.log(`   ✅ Step ${stepId}: ${result.status}`);
  });

  // Create specialized agents
  console.log('👥 Creating specialized agents...\n');

  const planner = orchestrator.createAgent({
    name: 'planner',
    role: 'Task Planning Specialist',
    config: {
      apiProvider: 'anthropic',
      apiKey,
      model: 'claude-3-5-sonnet-20241022',
      host: new MockHost(),
      systemPrompt: 'You are a task planning expert. Break down complex tasks into steps.',
      maxIterations: 5
    }
  });

  const coder = orchestrator.createAgent({
    name: 'coder',
    role: 'Code Implementation Specialist',
    config: {
      apiProvider: 'anthropic',
      apiKey,
      model: 'claude-3-5-sonnet-20241022',
      host: new MockHost(),
      systemPrompt: 'You are an expert programmer. Write clean, efficient code.',
      maxIterations: 5
    }
  });

  const reviewer = orchestrator.createAgent({
    name: 'reviewer',
    role: 'Code Review Specialist',
    config: {
      apiProvider: 'anthropic',
      apiKey,
      model: 'claude-3-5-sonnet-20241022',
      host: new MockHost(),
      systemPrompt: 'You are a code review expert. Analyze code for issues and improvements.',
      maxIterations: 3
    }
  });

  console.log('   ✅ Planner agent created');
  console.log('   ✅ Coder agent created');
  console.log('   ✅ Reviewer agent created');

  // Define workflow
  const workflow = orchestrator.createWorkflow({
    name: 'Software Development Pipeline',
    description: 'Plan, implement, and review code',
    steps: [
      {
        id: 'plan',
        agent: 'planner',
        task: 'Create a plan for implementing {{input}}. List 3-5 key steps.',
        timeout: 60000
      },
      {
        id: 'implement',
        agent: 'coder',
        task: 'Implement {{input}} following this plan: {{step.plan.output}}',
        dependsOn: ['plan'],
        timeout: 90000
      },
      {
        id: 'review',
        agent: 'reviewer',
        task: 'Review this implementation: {{step.implement.output}}. Provide specific feedback.',
        dependsOn: ['implement'],
        timeout: 60000
      }
    ],
    onStepComplete: (step, result) => {
      console.log(`      Output preview: ${result.output?.substring(0, 100)}...`);
    }
  });

  console.log('\n📋 Workflow created with 3 steps');

  // Execute workflow
  try {
    const result = await orchestrator.execute(
      workflow,
      'a simple HTTP server in Node.js'
    );

    console.log('\n\n🎉 Workflow completed successfully!\n');
    console.log('📊 Results Summary:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Steps completed: ${result.stepResults.length}`);

    // Show final results
    console.log('\n📝 Step Results:');
    for (const stepResult of result.stepResults) {
      console.log(`\n   ${stepResult.stepId} (${stepResult.agent}):`);
      console.log(`   Status: ${stepResult.result.status}`);
      console.log(`   Message: ${stepResult.result.message}`);
      
      if (stepResult.result.output) {
        const preview = stepResult.result.output.substring(0, 200);
        console.log(`   Output: ${preview}...`);
      }
    }

    console.log('\n✅ Demo complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
