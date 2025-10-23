# Cline Framework Architecture Visualization

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER APPLICATION                             │
│  (Your code using the framework)                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ import
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLINE FRAMEWORK API                             │
│  ClineAgent, HostAdapter, ToolHandler                                │
└─────────────┬──────────────────────────────────┬────────────────────┘
              │                                   │
              │                                   │
    ┌─────────▼──────────┐           ┌──────────▼───────────┐
    │   CORE ENGINE      │           │   HOST ADAPTER        │
    │                    │           │                       │
    │  - Agent Loop      │◄──────────┤  - TerminalHost      │
    │  - Tool Execution  │           │  - MockHost          │
    │  - State Management│           │  - (Custom hosts)    │
    └─────────┬──────────┘           └──────────────────────┘
              │
              │
    ┌─────────▼──────────┐
    │   API PROVIDERS    │
    │                    │
    │  - Anthropic       │
    │  - OpenAI          │
    │  - (Custom)        │
    └─────────┬──────────┘
              │
              │ HTTP/API
              ▼
    ┌──────────────────────┐
    │   LLM SERVICES       │
    │  (Claude, GPT, etc.) │
    └──────────────────────┘
```

## Component Interaction Flow

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ executeTask()
       ▼
┌──────────────────────────────────────────────────────────┐
│                    ClineAgent                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. Initialize conversation                         │  │
│  │ 2. Build system prompt                             │  │
│  │ 3. Call API provider ────────────────────┐        │  │
│  │                                           │        │  │
│  │ 4. Parse response    ◄───────────────────┘        │  │
│  │ 5. Extract tool uses                              │  │
│  │ 6. Execute tools ──────────────┐                  │  │
│  │                                 │                  │  │
│  │ 7. Add results ◄───────────────┘                  │  │
│  │ 8. Loop until complete                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
       │                      │                    │
       │ Events               │ Tool Exec          │ File/Cmd Ops
       ▼                      ▼                    ▼
┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
│ onMessage    │    │  ToolExecutor    │   │ HostAdapter  │
│ onToolUse    │    │  - Validate      │   │ - readFile   │
│ onComplete   │    │  - Execute       │   │ - writeFile  │
│ onError      │    │  - Format result │   │ - execute    │
└──────────────┘    └──────────────────┘   └──────────────┘
```

## Data Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│ Message {                               │
│   role: 'user',                         │
│   content: [{ type: 'text', ... }]      │
│ }                                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  System Prompt   │
        │  + Messages      │
        │  + Tools         │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  API Provider    │
        │  (Anthropic)     │
        └────────┬─────────┘
                 │ Stream
                 ▼
┌─────────────────────────────────────────┐
│ Message {                               │
│   role: 'assistant',                    │
│   content: [                            │
│     { type: 'text', text: '...' },      │
│     { type: 'tool_use', id: '1',        │
│       name: 'write_to_file',            │
│       input: { path: '...', ... }       │
│     }                                   │
│   ]                                     │
│ }                                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Tool Executor   │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  Host Adapter    │
        └────────┬─────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Message {                               │
│   role: 'user',                         │
│   content: [                            │
│     { type: 'tool_result',              │
│       tool_use_id: '1',                 │
│       content: 'Success...'             │
│     }                                   │
│   ]                                     │
│ }                                       │
└─────────────────┬───────────────────────┘
                  │
                  │ (Loop continues)
                  ▼
            Complete or Next Iteration
```

## Class Hierarchy

```
EventEmitter
    │
    └── ClineAgent
            │
            ├── provider: ApiProvider
            │       │
            │       ├── AnthropicProvider
            │       └── OpenAIProvider
            │
            ├── config: AgentConfig
            │       │
            │       ├── host: HostAdapter
            │       │       │
            │       │       ├── TerminalHost
            │       │       └── MockHost
            │       │
            │       └── tools: ToolHandler[]
            │               │
            │               ├── WriteToFileTool
            │               ├── ReadFileTool
            │               ├── ListFilesTool
            │               ├── ExecuteCommandTool
            │               ├── AskUserTool
            │               └── AttemptCompletionTool
            │
            └── state: AgentState
                    │
                    ├── taskId: string
                    ├── status: string
                    ├── messages: Message[]
                    ├── currentIteration: number
                    └── tokensUsed: object
```

## State Machine

```
                    ┌─────────┐
                    │  IDLE   │
                    └────┬────┘
                         │ executeTask()
                         ▼
                  ┌─────────────┐
                  │  THINKING   │◄────────┐
                  └──────┬──────┘         │
                         │                │
                         │ tools found    │
                         ▼                │
                ┌──────────────────┐     │
                │ EXECUTING_TOOL   │     │
                └────────┬─────────┘     │
                         │               │
                         │ results       │
                         └───────────────┘
                         │
                         │ no more tools
                         ▼
                  ┌─────────────┐
                  │  COMPLETED  │
                  └─────────────┘
                         │
                         │ error
                         ▼
                  ┌─────────────┐
                  │    ERROR    │
                  └─────────────┘
```

## Tool Execution Pipeline

```
LLM Response
    │
    ▼
┌──────────────────────┐
│  Parse Tool Uses     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  For each tool:      │
│                      │
│  1. Find handler     │
│  2. Request approval │────► User: Approve? ──► No ──► Abort
│  3. Validate params  │                       │
│  4. Execute          │                      Yes
│  5. Catch errors     │                       │
│  6. Format result    │◄──────────────────────┘
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Collect Results     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Create User Message │
│  with Tool Results   │
└──────┬───────────────┘
       │
       ▼
  Continue Loop
```

## Host Abstraction Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    HostAdapter Interface                     │
│  (Abstract operations that vary by environment)              │
└───────┬──────────────────────┬──────────────────────────────┘
        │                      │
        │                      │
        ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│  TerminalHost    │   │   MockHost       │
│                  │   │                  │
│ - Real file I/O  │   │ - In-memory      │
│ - Real commands  │   │ - Test mode      │
│ - User prompts   │   │ - Logging        │
└──────────────────┘   └──────────────────┘
        │
        │ (Future)
        ▼
┌──────────────────┐
│  VSCodeHost      │
│                  │
│ - VSCode APIs    │
│ - Webview        │
│ - UI integration │
└──────────────────┘
```

## Message Types Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ TextBlock    │     │ ImageBlock   │     │ ToolUseBlock │
│              │     │              │     │              │
│ type: 'text' │     │ type: 'image'│     │type:'tool_use│
│ text: string │     │ source: {...}│     │ id: string   │
│              │     │              │     │ name: string │
│              │     │              │     │ input: {...} │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │
        └────────────────────┴─────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  ContentBlock[] │
                    └────────┬────────┘
                             │
                             ▼
                      ┌────────────┐
                      │  Message   │
                      │            │
                      │ role: user │
                      │ content:[] │
                      └────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Conversation   │
                    │  Message[]      │
                    └─────────────────┘
```

## Event System

```
┌──────────────────────────────────────────┐
│           ClineAgent (EventEmitter)      │
└──────────────┬───────────────────────────┘
               │
               ├──► 'state_change' ──► AgentState
               │
               ├──► 'message' ──────► Message
               │
               ├──► 'tool_use' ─────► ToolUseBlock
               │
               ├──► 'tool_result' ──► ToolResult
               │
               ├──► 'complete' ─────► TaskResult
               │
               └──► 'error' ────────► Error

Application subscribes:
    agent.on('state_change', (state) => { ... })
    agent.on('tool_use', (tool) => { ... })
    agent.on('complete', (result) => { ... })
```

## Configuration Flow

```
User Code
    │
    ▼
┌──────────────────────────────────────┐
│  AgentConfig {                       │
│    apiProvider: 'anthropic',         │
│    apiKey: string,                   │
│    model: string,                    │
│    host: HostAdapter,                │
│    tools?: ToolHandler[],            │
│    onToolUse?: callback,             │
│    ...                               │
│  }                                   │
└────────────┬─────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │  ClineAgent()  │
    └────────┬───────┘
             │
             ├──► Initialize Provider
             │
             ├──► Store Host Adapter
             │
             ├──► Register Tools
             │
             └──► Setup Event Listeners
```

## Comparison: Original vs Framework

```
┌─────────────────────────────────────────────────────────────┐
│                     ORIGINAL CLINE                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   VSCode     │  │    Task      │  │   Services   │     │
│  │  Extension   │──┤  (4689 lines)│──┤  (30+)       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  652 files, 6.5MB, Heavy dependencies                       │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Extract & Transform
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLINE FRAMEWORK                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ HostAdapter  │  │ ClineAgent   │  │  Providers   │     │
│  │  (abstract)  │──┤  (360 lines) │──┤  (2 core)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  10 files, ~40KB, Minimal dependencies                      │
└─────────────────────────────────────────────────────────────┘
```

## Usage Patterns

### Pattern 1: Simple Task Execution
```
User ──► ClineAgent.executeTask() ──► Result
```

### Pattern 2: Interactive Session
```
User ──► ClineAgent.executeTask()
           │
           ├──► onToolUse() ──► User approves ──► Continue
           │
           └──► askUser() ──► User responds ──► Continue
```

### Pattern 3: Custom Tool Integration
```
CustomTool implements ToolHandler
    │
    └──► Register in AgentConfig
           │
           └──► LLM discovers and uses tool
```

### Pattern 4: Multi-Environment
```
Development: TerminalHost ──► ClineAgent
Testing:     MockHost     ──► ClineAgent
Production:  CustomHost   ──► ClineAgent
```

## Directory Structure

```
cline-framework/
│
├── core/                   Core framework
│   ├── types.ts           All type definitions
│   ├── agent.ts           Main agent class
│   ├── tools.ts           Built-in tools
│   ├── providers.ts       API providers
│   └── index.ts           Module exports
│
├── host/                   Host adapters
│   └── index.ts           Terminal & Mock hosts
│
├── services/               Optional services (future)
│   ├── mcp/
│   ├── browser/
│   └── terminal/
│
├── demo/                   Example applications
│   ├── simple-agent.js
│   ├── file-operations.js
│   └── custom-host.js
│
├── docs/                   Documentation
│   ├── API.md
│   └── CUSTOM_TOOLS.md
│
├── package.json           Package config
├── tsconfig.json          TypeScript config
└── README.md              Main documentation
```

## Execution Timeline

```
Time →
─────┼──────┼──────┼──────┼──────┼──────┼──────┼──────►
     │      │      │      │      │      │      │
     Init   API    Parse  Tool   API    Parse  Complete
            Call          Exec   Call
     
     ▼      ▼      ▼      ▼      ▼      ▼      ▼
     
Start │  Thinking│ Exec  │ Thinking│  Exec │ Done
      │          │ Tool  │         │ Tool  │
      │   LLM    │       │   LLM   │       │
      │  thinks  │  runs │ thinks  │  runs │

Events emitted:
state_change   →   →   →   →   →   →   →
message            ✓      ✓      ✓      ✓
tool_use                 ✓            ✓
tool_result              ✓            ✓
complete                                   ✓
```

This visualization document shows how all the pieces fit together in the Cline Framework!
