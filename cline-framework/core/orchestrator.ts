/**
 * Layer 4: Agent Orchestration - Multi-agent coordination and workflows
 */

import { ClineAgent } from './agent';
import { AgentConfig, TaskResult, TaskOptions } from './types';
import { EventEmitter } from 'events';

/**
 * Agent definition for orchestrator
 */
export interface OrchestratedAgent {
  name: string;
  role: string;
  config: AgentConfig;
  instance?: ClineAgent;
  capabilities?: string[];
  priority?: number;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  agent: string; // Agent name
  task: string;
  dependsOn?: string[]; // Step IDs this depends on
  timeout?: number;
  retries?: number;
  condition?: (context: WorkflowContext) => boolean;
}

/**
 * Workflow definition
 */
export interface Workflow {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  onStepComplete?: (step: WorkflowStep, result: TaskResult) => void;
  onStepError?: (step: WorkflowStep, error: Error) => void;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;
  input: any;
  stepResults: Map<string, TaskResult>;
  metadata: Record<string, any>;
  sharedData: Map<string, any>;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'partial';
  stepResults: Array<{
    stepId: string;
    agent: string;
    result: TaskResult;
  }>;
  duration: number;
  error?: Error;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  strategy?: 'sequential' | 'parallel' | 'dynamic';
  maxConcurrentAgents?: number;
  resourcePool?: {
    memory?: string;
    timeout?: number;
  };
  messagebus?: EventEmitter;
  executor?: {
    beforeStep?: (step: WorkflowStep, context: WorkflowContext) => Promise<void>;
    afterStep?: (step: WorkflowStep, result: TaskResult, context: WorkflowContext) => Promise<void>;
    onError?: (error: Error, step: WorkflowStep, context: WorkflowContext) => Promise<void>;
  };
}

/**
 * Agent Orchestrator - Layer 4
 * 
 * Coordinates multiple agents and manages complex workflows.
 * Use this for multi-agent systems and distributed task execution.
 */
export class AgentOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private agents: Map<string, OrchestratedAgent> = new Map();
  private activeWorkflows: Map<string, WorkflowContext> = new Map();

  constructor(config: OrchestratorConfig = {}) {
    super();
    this.config = {
      strategy: 'sequential',
      maxConcurrentAgents: 3,
      ...config
    };
  }

  /**
   * Create and register a new agent
   */
  createAgent(agent: OrchestratedAgent): ClineAgent {
    const instance = new ClineAgent(agent.config);
    agent.instance = instance;
    
    this.agents.set(agent.name, agent);
    this.emit('agent:created', agent.name);
    
    return instance;
  }

  /**
   * Add an existing agent
   */
  addAgent(name: string, agent: ClineAgent, metadata?: Partial<OrchestratedAgent>): void {
    const orchestratedAgent: OrchestratedAgent = {
      name,
      role: metadata?.role || 'worker',
      config: metadata?.config || {} as AgentConfig,
      instance: agent,
      capabilities: metadata?.capabilities,
      priority: metadata?.priority
    };
    
    this.agents.set(name, orchestratedAgent);
    this.emit('agent:added', name);
  }

  /**
   * Remove an agent
   */
  removeAgent(name: string): void {
    this.agents.delete(name);
    this.emit('agent:removed', name);
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): ClineAgent | undefined {
    return this.agents.get(name)?.instance;
  }

  /**
   * List all agents
   */
  listAgents(): OrchestratedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Create a workflow
   */
  createWorkflow(workflow: Workflow): Workflow {
    // Validate workflow
    this.validateWorkflow(workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: Workflow, input: any, options?: TaskOptions): Promise<WorkflowResult> {
    const startTime = Date.now();
    const workflowId = this.generateWorkflowId();
    
    // Create execution context
    const context: WorkflowContext = {
      workflowId,
      input,
      stepResults: new Map(),
      metadata: {},
      sharedData: new Map()
    };
    
    this.activeWorkflows.set(workflowId, context);
    this.emit('workflow:start', workflowId, workflow.name);

    try {
      if (this.config.strategy === 'sequential') {
        await this.executeSequential(workflow, context, options);
      } else if (this.config.strategy === 'parallel') {
        await this.executeParallel(workflow, context, options);
      } else {
        await this.executeDynamic(workflow, context, options);
      }

      const result: WorkflowResult = {
        workflowId,
        status: 'completed',
        stepResults: Array.from(context.stepResults.entries()).map(([stepId, result]) => ({
          stepId,
          agent: workflow.steps.find(s => s.id === stepId)?.agent || '',
          result
        })),
        duration: Date.now() - startTime
      };

      this.emit('workflow:complete', workflowId, result);
      return result;
    } catch (error) {
      const result: WorkflowResult = {
        workflowId,
        status: 'failed',
        stepResults: Array.from(context.stepResults.entries()).map(([stepId, result]) => ({
          stepId,
          agent: workflow.steps.find(s => s.id === stepId)?.agent || '',
          result
        })),
        duration: Date.now() - startTime,
        error: error as Error
      };

      this.emit('workflow:error', workflowId, error);
      return result;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute workflow sequentially
   */
  private async executeSequential(
    workflow: Workflow,
    context: WorkflowContext,
    options?: TaskOptions
  ): Promise<void> {
    for (const step of workflow.steps) {
      await this.executeStep(step, workflow, context, options);
    }
  }

  /**
   * Execute workflow in parallel
   */
  private async executeParallel(
    workflow: Workflow,
    context: WorkflowContext,
    options?: TaskOptions
  ): Promise<void> {
    const stepPromises = workflow.steps.map(step =>
      this.executeStep(step, workflow, context, options)
    );
    
    await Promise.all(stepPromises);
  }

  /**
   * Execute workflow dynamically based on dependencies
   */
  private async executeDynamic(
    workflow: Workflow,
    context: WorkflowContext,
    options?: TaskOptions
  ): Promise<void> {
    const completed = new Set<string>();
    const pending = new Set(workflow.steps.map(s => s.id));

    while (pending.size > 0) {
      // Find steps that can execute now
      const ready = workflow.steps.filter(step => {
        if (!pending.has(step.id)) return false;
        if (!step.dependsOn || step.dependsOn.length === 0) return true;
        return step.dependsOn.every(dep => completed.has(dep));
      });

      if (ready.length === 0 && pending.size > 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      // Execute ready steps (up to maxConcurrentAgents)
      const batch = ready.slice(0, this.config.maxConcurrentAgents);
      const batchPromises = batch.map(async step => {
        await this.executeStep(step, workflow, context, options);
        completed.add(step.id);
        pending.delete(step.id);
      });

      await Promise.all(batchPromises);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    workflow: Workflow,
    context: WorkflowContext,
    options?: TaskOptions
  ): Promise<void> {
    // Check condition if provided
    if (step.condition && !step.condition(context)) {
      context.stepResults.set(step.id, {
        status: 'cancelled',
        message: 'Condition not met',
        output: ''
      });
      return;
    }

    // Get agent
    const agentDef = this.agents.get(step.agent);
    if (!agentDef || !agentDef.instance) {
      throw new Error(`Agent ${step.agent} not found`);
    }

    this.emit('step:start', step.id, step.agent);

    // Execute before hook
    if (this.config.executor?.beforeStep) {
      await this.config.executor.beforeStep(step, context);
    }

    try {
      // Build task with context
      const task = this.buildTaskWithContext(step.task, context);
      
      // Execute with retries
      const maxRetries = step.retries || 1;
      let lastError: Error | undefined;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await agentDef.instance.executeTask(task, options);
          context.stepResults.set(step.id, result);

          // Execute after hook
          if (this.config.executor?.afterStep) {
            await this.config.executor.afterStep(step, result, context);
          }

          // Call workflow callback
          if (workflow.onStepComplete) {
            workflow.onStepComplete(step, result);
          }

          this.emit('step:complete', step.id, result);
          return;
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries - 1) {
            this.emit('step:retry', step.id, attempt + 1);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      throw lastError || new Error('Step execution failed');
    } catch (error) {
      // Execute error hook
      if (this.config.executor?.onError) {
        await this.config.executor.onError(error as Error, step, context);
      }

      // Call workflow error callback
      if (workflow.onStepError) {
        workflow.onStepError(step, error as Error);
      }

      this.emit('step:error', step.id, error);
      throw error;
    }
  }

  /**
   * Build task string with context substitution
   */
  private buildTaskWithContext(task: string, context: WorkflowContext): string {
    let result = task;

    // Replace {{input}} with workflow input
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(context.input));

    // Replace {{step.X.output}} with step result output
    for (const [stepId, stepResult] of context.stepResults) {
      const pattern = new RegExp(`\\{\\{step\\.${stepId}\\.output\\}\\}`, 'g');
      result = result.replace(pattern, stepResult.output || '');
    }

    return result;
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: Workflow): void {
    const stepIds = new Set(workflow.steps.map(s => s.id));

    for (const step of workflow.steps) {
      // Check agent exists
      if (!this.agents.has(step.agent)) {
        throw new Error(`Agent ${step.agent} not found in step ${step.id}`);
      }

      // Check dependencies exist
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!stepIds.has(dep)) {
            throw new Error(`Dependency ${dep} not found in step ${step.id}`);
          }
        }
      }
    }
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows.keys());
  }

  /**
   * Get workflow context
   */
  getWorkflowContext(workflowId: string): WorkflowContext | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * Cancel a workflow
   */
  cancelWorkflow(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);
    this.emit('workflow:cancelled', workflowId);
  }
}
