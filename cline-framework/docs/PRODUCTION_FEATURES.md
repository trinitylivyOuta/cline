# Production Features Guide

This guide covers the production-ready features added to the Cline Framework for robust, scalable deployments.

## Overview

The framework now includes essential production features:

1. **Context Window Management** - Automatic token counting and conversation optimization
2. **Retry Logic with Backoff** - Automatic retry for transient errors
3. **Configuration Validation** - Runtime validation with helpful error messages
4. **Structured Logging** - Consistent logging with levels and formatting
5. **Error Classification** - Intelligent error categorization and handling

---

## Context Window Management

Automatically manages conversation history to stay within token limits.

### Basic Usage

```typescript
import { ContextManager } from '@cline/framework';

const manager = new ContextManager({
  maxTokens: 100000,        // Total context window
  reservedTokens: 4096,     // Reserve for response
  summaryThreshold: 0.8,    // Summarize at 80% capacity
  priorityMessages: 5,      // Keep last 5 messages
});

// Add messages
manager.setSystemPrompt('You are a helpful assistant');
manager.addMessage({ role: 'user', content: 'Hello!' });
manager.addMessage({ role: 'assistant', content: 'Hi there!' });

// Get statistics
const stats = manager.getStats();
console.log(`Tokens used: ${stats.totalTokens}`);
console.log(`Available: ${stats.availableTokens}`);
console.log(`Needs optimization: ${stats.needsSummarization}`);

// Get optimized messages for API call
const messages = manager.getMessages();
```

### Auto-Optimization

The context manager automatically:
- Estimates token counts (4 chars ≈ 1 token)
- Tracks total tokens including system prompt
- Summarizes old messages when threshold reached
- Keeps recent priority messages intact

### State Management

```typescript
// Export state
const state = manager.export();
// Save to database...

// Import state
manager.import(state);
// Resume conversation...
```

### Configuration Options

```typescript
interface ContextConfig {
  maxTokens: number;          // Maximum context window size
  reservedTokens: number;     // Tokens to reserve for response
  summaryThreshold: number;   // When to trigger optimization (0-1)
  priorityMessages?: number;  // Number of recent messages to keep
}
```

---

## Retry Logic with Backoff

Automatically retries failed API calls with exponential backoff.

### Basic Usage

```typescript
import { RetryHandler } from '@cline/framework';

const handler = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,        // Start with 1 second
  maxDelay: 60000,           // Cap at 60 seconds
  backoffMultiplier: 2,      // Double each time
});

// Execute with retry
const result = await handler.execute(async () => {
  return await someApiCall();
});
```

### With Retry Callbacks

```typescript
const result = await handler.execute(
  async () => await apiCall(),
  (context) => {
    console.log(`Retry attempt ${context.attempt}`);
    console.log(`Next delay: ${context.nextDelay}ms`);
  }
);
```

### Error Classification

```typescript
import { classifyError, isRetryable, ErrorType } from '@cline/framework';

try {
  await apiCall();
} catch (error) {
  const type = classifyError(error);
  
  switch (type) {
    case ErrorType.RATE_LIMIT:
      // Wait and retry
      break;
    case ErrorType.AUTH:
      // Re-authenticate
      break;
    case ErrorType.VALIDATION:
      // Fix request
      break;
  }
  
  if (isRetryable(error)) {
    // Automatic retry recommended
  }
}
```

### Error Types

- `RATE_LIMIT` - 429 status, rate limit errors (retryable)
- `NETWORK` - Network connectivity issues (retryable)
- `TIMEOUT` - Request timeouts (retryable)
- `SERVER` - 5xx server errors (retryable)
- `AUTH` - 401/403 authorization errors (not retryable)
- `VALIDATION` - 4xx validation errors (not retryable)
- `UNKNOWN` - Unclassified errors

### Decorator

```typescript
import { withRetry } from '@cline/framework';

class ApiClient {
  @withRetry({ maxRetries: 3 })
  async fetchData() {
    return await this.apiCall();
  }
}
```

---

## Configuration Validation

Runtime validation with helpful error messages.

### Basic Usage

```typescript
import { ConfigValidator } from '@cline/framework';

const validator = new ConfigValidator();

validator
  .required('apiKey', config.apiKey)
  .string('apiKey', config.apiKey)
  .enum('provider', config.provider, ['anthropic', 'openai'])
  .range('temperature', config.temperature, 0, 1);

const result = validator.result();
if (!result.valid) {
  for (const error of result.errors) {
    console.error(`${error.field}: ${error.message}`);
    if (error.suggestion) {
      console.log(`  Suggestion: ${error.suggestion}`);
    }
  }
}

// Or throw if invalid
validator.throwIfInvalid();
```

### Validation Methods

```typescript
validator
  .required('field', value)
  .string('field', value)
  .number('field', value)
  .boolean('field', value)
  .enum('field', value, ['option1', 'option2'])
  .min('field', value, 0)
  .max('field', value, 100)
  .range('field', value, 0, 100)
  .pattern('field', value, /^https?:\/\//)
  .array('field', value)
  .object('field', value)
  .custom('field', value, (v) => v > 0, 'Must be positive');
```

### Pre-built Validators

```typescript
import { validateLLMClientConfig, validateClineAgentConfig } from '@cline/framework';

// Validate LLM client config
const result = validateLLMClientConfig({
  provider: 'anthropic',
  apiKey: 'sk-...',
  model: 'claude-3-5-sonnet-20241022',
});

if (!result.valid) {
  console.error('Invalid configuration:', result.errors);
}

// Validate agent config
const agentResult = validateClineAgentConfig({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxIterations: 25,
});
```

### Error Messages

Validation errors include:
- Field name
- Clear error message
- Current value (for debugging)
- Actionable suggestion

Example:
```
Configuration validation failed:
  • apiKey: Field "apiKey" is required
    Suggestion: Provide a value for apiKey
  • temperature: Field "temperature" must be between 0 and 1
    Suggestion: Use a value between 0 and 1
```

---

## Structured Logging

Consistent logging with levels, timestamps, and formatting.

### Basic Usage

```typescript
import { Logger, LogLevel } from '@cline/framework';

const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'MyApp',
  timestamps: true,
  colors: true,
});

logger.debug('Debug information');
logger.info('Application started');
logger.warn('This is a warning');
logger.error('An error occurred', error);
```

### Child Loggers

```typescript
const agentLogger = logger.child('Agent');
const toolLogger = logger.child('ToolExecution');

agentLogger.info('Starting task execution');
toolLogger.info('Executing file operation');
```

### Custom Output

```typescript
const logger = new Logger({
  output: (entry) => {
    // Custom logging (e.g., send to external service)
    myLogService.log({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: entry.context,
      data: entry.data,
    });
  },
});
```

### Log Levels

```typescript
enum LogLevel {
  DEBUG = 0,    // Detailed debugging information
  INFO = 1,     // General information
  WARN = 2,     // Warning messages
  ERROR = 3,    // Error messages
  NONE = 4,     // No logging
}
```

### Global Logger

```typescript
import { getLogger, configureLogger } from '@cline/framework';

// Configure once
configureLogger({
  level: LogLevel.INFO,
  prefix: 'MyApp',
});

// Use anywhere
const logger = getLogger();
logger.info('Message');
```

### Output Format

```
[12:34:56.789] [MyApp] [Context] [INFO] Application started
[12:34:57.123] [MyApp] [Agent] [ERROR] API call failed
Error: Rate limit exceeded
  at ...
```

---

## Best Practices

### Context Management

1. **Set Appropriate Limits**: Configure `maxTokens` based on your model's context window
2. **Reserve Tokens**: Always reserve enough tokens for the model's response
3. **Adjust Threshold**: Lower threshold (0.7) for more aggressive optimization
4. **Priority Messages**: Keep 3-5 recent messages for context continuity

### Retry Logic

1. **Use for Transient Errors**: Only retry rate limits, network issues, and server errors
2. **Respect Backoff**: Let the exponential backoff do its job
3. **Set Reasonable Limits**: 3-5 retries is usually sufficient
4. **Monitor Callbacks**: Log retry attempts for debugging

### Configuration Validation

1. **Validate Early**: Check configuration before starting tasks
2. **Provide Suggestions**: Help users fix configuration errors
3. **Use Pre-built Validators**: Leverage `validateLLMClientConfig` and `validateClineAgentConfig`
4. **Document Requirements**: Clearly document configuration options

### Logging

1. **Use Appropriate Levels**: DEBUG for development, INFO for production
2. **Add Context**: Use child loggers for different components
3. **Include Data**: Pass error objects and relevant data
4. **Configure Once**: Set up global logger at application start
5. **Structured Data**: Use the `data` parameter for structured information

---

## Complete Example

```typescript
import {
  ClineAgent,
  TerminalHost,
  ContextManager,
  RetryHandler,
  validateClineAgentConfig,
  Logger,
  LogLevel,
  classifyError,
} from '@cline/framework';

// Configure logging
const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'MyApp',
});

// Validate configuration
const config = {
  apiProvider: 'anthropic' as const,
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxIterations: 25,
};

const validation = validateClineAgentConfig(config);
if (!validation.valid) {
  logger.error('Invalid configuration', validation.errors);
  process.exit(1);
}

// Set up context management
const contextManager = new ContextManager({
  maxTokens: 100000,
  reservedTokens: 4096,
  summaryThreshold: 0.8,
});

// Set up retry handler
const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 60000,
});

// Create agent
const agent = new ClineAgent({
  ...config,
  host: new TerminalHost(),
});

// Execute with production features
async function executeTask(task: string) {
  logger.info('Starting task', { task });
  
  try {
    const result = await retryHandler.execute(
      async () => await agent.executeTask(task),
      (context) => {
        logger.warn(`Retrying attempt ${context.attempt}`, {
          delay: context.nextDelay,
        });
      }
    );
    
    logger.info('Task completed', { status: result.status });
    return result;
    
  } catch (error: any) {
    const errorType = classifyError(error);
    logger.error('Task failed', {
      errorType,
      message: error.message,
    });
    
    throw error;
  }
}

// Run
executeTask('Create a Node.js HTTP server')
  .then(() => logger.info('Success'))
  .catch((error) => logger.error('Fatal error', error));
```

---

## Performance Considerations

### Context Manager

- Token estimation is fast (O(n) where n = message length)
- Optimization only runs when needed (threshold check)
- Summary creation is lightweight (no LLM calls)

### Retry Handler

- Adds minimal overhead when no retries needed
- Exponential backoff prevents rapid retry storms
- Jitter prevents thundering herd problem

### Validation

- Runs once at configuration time
- Fast type checks and comparisons
- No runtime performance impact after validation

### Logging

- Minimal overhead at appropriate log levels
- String formatting only when message will be logged
- Custom output handlers allow integration with any logging backend

---

## Troubleshooting

### Context Manager

**Problem**: Messages being summarized too aggressively

**Solution**: Increase `summaryThreshold` or `priorityMessages`

```typescript
const manager = new ContextManager({
  summaryThreshold: 0.9,  // Wait until 90% full
  priorityMessages: 10,   // Keep last 10 messages
});
```

### Retry Handler

**Problem**: Too many retries for non-retryable errors

**Solution**: Check error classification

```typescript
if (!isRetryable(error)) {
  throw error; // Don't retry
}
```

### Validation

**Problem**: Validation errors not clear

**Solution**: Add custom messages

```typescript
validator.required(
  'apiKey',
  config.apiKey,
  'API key is required. Get one from https://console.anthropic.com'
);
```

### Logging

**Problem**: Too much log output

**Solution**: Adjust log level

```typescript
const logger = new Logger({
  level: LogLevel.WARN, // Only warnings and errors
});
```

---

## Next Steps

- [Getting Started Guide](./GETTING_STARTED.md) - Basic framework usage
- [Usage Guide](./USAGE_GUIDE.md) - Comprehensive examples
- [API Reference](./API.md) - Complete API documentation
- [Layered Guide](./LAYERED_GUIDE.md) - Understanding the layer architecture

---

**Framework Version**: 0.2.0  
**Last Updated**: October 2025  
**Status**: Production Ready
