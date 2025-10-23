/**
 * Core module exports - Layered Architecture
 * 
 * Layer 1: LLMClient - Raw API access
 * Layer 2: SimpleLLM - Single request-response
 * Layer 3: ClineAgent - Agentic loop
 * Layer 4: AgentOrchestrator - Multi-agent coordination
 */

// Layer 1: Raw LLM Client
export { LLMClient } from './llm-client';
export type { LLMClientConfig, CompletionRequest, StreamChunk } from './llm-client';

// Layer 2: Simple LLM Application
export { SimpleLLM } from './simple-llm';
export type {
  SimpleTool,
  SimpleToolContext,
  SimpleToolResult,
  ConversationMessage,
  LLMResponse,
  SimpleLLMConfig,
  SendMessageOptions
} from './simple-llm';

// Layer 3: Agentic Loop (main agent)
export * from './agent';

// Layer 4: Agent Orchestration
export { AgentOrchestrator } from './orchestrator';
export type {
  OrchestratedAgent,
  WorkflowStep,
  Workflow,
  WorkflowContext,
  WorkflowResult,
  OrchestratorConfig
} from './orchestrator';

// Shared exports
export * from './types';
export * from './tools';
export * from './providers';

// Production features
export * from './context-manager';
export * from './retry-handler';
export * from './config-validator';
export * from './logger';
