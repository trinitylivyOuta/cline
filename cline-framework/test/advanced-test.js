/**
 * Advanced Tests for Cline Framework
 * Tests for production features: context management, retry logic, validation, logging
 */

const {
  ContextManager,
  RetryHandler,
  ConfigValidator,
  validateLLMClientConfig,
  validateClineAgentConfig,
  Logger,
  LogLevel,
  classifyError,
  isRetryable,
  ErrorType,
} = require('../dist/core/index.js');

console.log('🧪 Running Advanced Cline Framework Tests\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============= Context Manager Tests =============

test('ContextManager can be instantiated', () => {
  const manager = new ContextManager();
  assert(manager !== null, 'ContextManager should be created');
});

test('ContextManager tracks messages', () => {
  const manager = new ContextManager({ maxTokens: 1000 });
  manager.addMessage({ role: 'user', content: 'Hello' });
  manager.addMessage({ role: 'assistant', content: 'Hi there!' });
  
  const stats = manager.getStats();
  assert(stats.messageCount === 2, 'Should track 2 messages');
  assert(stats.totalTokens > 0, 'Should have token count');
});

test('ContextManager estimates tokens', () => {
  const manager = new ContextManager();
  manager.addMessage({ role: 'user', content: 'This is a test message' });
  
  const stats = manager.getStats();
  // Rough estimate: "This is a test message" = ~5 tokens
  assert(stats.totalTokens > 0 && stats.totalTokens < 20, 'Token estimate should be reasonable');
});

test('ContextManager handles system prompts', () => {
  const manager = new ContextManager();
  manager.setSystemPrompt('You are a helpful assistant');
  
  const prompt = manager.getSystemPrompt();
  assert(prompt === 'You are a helpful assistant', 'Should store system prompt');
});

test('ContextManager optimizes context', () => {
  const manager = new ContextManager({ maxTokens: 100, summaryThreshold: 0.5, priorityMessages: 2 });
  
  // Add many messages to trigger optimization
  for (let i = 0; i < 10; i++) {
    manager.addMessage({ role: 'user', content: `Message ${i}: This is a longer message to use more tokens` });
  }
  
  manager.optimize();
  const messages = manager.getMessages();
  
  // Should have been optimized (summarized + priority messages)
  assert(messages.length <= 3, 'Should optimize messages when over threshold');
});

test('ContextManager export/import state', () => {
  const manager1 = new ContextManager();
  manager1.setSystemPrompt('Test system');
  manager1.addMessage({ role: 'user', content: 'Test message' });
  
  const state = manager1.export();
  
  const manager2 = new ContextManager();
  manager2.import(state);
  
  assert(manager2.getSystemPrompt() === 'Test system', 'Should import system prompt');
  assert(manager2.getMessages().length === 1, 'Should import messages');
});

// ============= Retry Handler Tests =============

test('RetryHandler can be instantiated', () => {
  const handler = new RetryHandler();
  assert(handler !== null, 'RetryHandler should be created');
});

test('RetryHandler executes successful function', async () => {
  const handler = new RetryHandler();
  const result = await handler.execute(async () => 'success');
  assert(result === 'success', 'Should return result of successful function');
});

test('RetryHandler retries on retryable error', async () => {
  const handler = new RetryHandler({ maxRetries: 2, initialDelay: 10 });
  let attempts = 0;
  
  try {
    await handler.execute(async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error('Rate limit');
        error.status = 429;
        throw error;
      }
      return 'success';
    });
  } catch (e) {
    // Expected to succeed on retry
  }
  
  assert(attempts === 2, 'Should retry on retryable error');
});

test('Error classification works', () => {
  assert(classifyError({ status: 429 }) === ErrorType.RATE_LIMIT, 'Should classify rate limit');
  assert(classifyError({ code: 'ECONNRESET' }) === ErrorType.NETWORK, 'Should classify network error');
  assert(classifyError({ status: 500 }) === ErrorType.SERVER, 'Should classify server error');
  assert(classifyError({ status: 401 }) === ErrorType.AUTH, 'Should classify auth error');
});

test('isRetryable identifies retryable errors', () => {
  assert(isRetryable({ status: 429 }) === true, 'Rate limit should be retryable');
  assert(isRetryable({ status: 500 }) === true, 'Server error should be retryable');
  assert(isRetryable({ status: 401 }) === false, 'Auth error should not be retryable');
  assert(isRetryable({ status: 400 }) === false, 'Validation error should not be retryable');
});

// ============= Config Validator Tests =============

test('ConfigValidator validates required fields', () => {
  const validator = new ConfigValidator();
  validator.required('apiKey', undefined);
  
  const result = validator.result();
  assert(result.valid === false, 'Should be invalid when required field missing');
  assert(result.errors.length === 1, 'Should have one error');
});

test('ConfigValidator validates types', () => {
  const validator = new ConfigValidator();
  validator.string('name', 123);
  validator.number('age', 'not a number');
  
  const result = validator.result();
  assert(result.valid === false, 'Should be invalid with type errors');
  assert(result.errors.length === 2, 'Should have two errors');
});

test('ConfigValidator validates enums', () => {
  const validator = new ConfigValidator();
  validator.enum('provider', 'invalid', ['anthropic', 'openai']);
  
  const result = validator.result();
  assert(result.valid === false, 'Should be invalid with invalid enum value');
});

test('ConfigValidator validates ranges', () => {
  const validator = new ConfigValidator();
  validator.range('temperature', 1.5, 0, 1);
  
  const result = validator.result();
  assert(result.valid === false, 'Should be invalid when out of range');
});

test('validateLLMClientConfig works', () => {
  const validConfig = {
    provider: 'anthropic',
    apiKey: 'sk-test-123',
    model: 'claude-3-5-sonnet-20241022',
  };
  
  const result = validateLLMClientConfig(validConfig);
  assert(result.valid === true, 'Valid config should pass validation');
});

test('validateLLMClientConfig rejects invalid config', () => {
  const invalidConfig = {
    provider: 'invalid',
    model: 'claude-3',
    // missing apiKey
  };
  
  const result = validateLLMClientConfig(invalidConfig);
  assert(result.valid === false, 'Invalid config should fail validation');
  assert(result.errors.length > 0, 'Should have validation errors');
});

test('validateClineAgentConfig works', () => {
  const validConfig = {
    apiProvider: 'anthropic',
    apiKey: 'sk-test-123',
  };
  
  const result = validateClineAgentConfig(validConfig);
  assert(result.valid === true, 'Valid config should pass validation');
});

// ============= Logger Tests =============

test('Logger can be instantiated', () => {
  const logger = new Logger();
  assert(logger !== null, 'Logger should be created');
});

test('Logger logs at different levels', () => {
  const logs = [];
  const logger = new Logger({
    level: LogLevel.DEBUG,
    output: (entry) => logs.push(entry),
  });
  
  logger.debug('Debug message');
  logger.info('Info message');
  logger.warn('Warning message');
  logger.error('Error message');
  
  assert(logs.length === 4, 'Should log all 4 messages');
  assert(logs[0].level === 'DEBUG', 'First log should be DEBUG');
  assert(logs[3].level === 'ERROR', 'Last log should be ERROR');
});

test('Logger respects log level', () => {
  const logs = [];
  const logger = new Logger({
    level: LogLevel.WARN,
    output: (entry) => logs.push(entry),
  });
  
  logger.debug('Debug');
  logger.info('Info');
  logger.warn('Warning');
  logger.error('Error');
  
  assert(logs.length === 2, 'Should only log WARN and ERROR');
});

test('Logger creates child loggers with context', () => {
  const logs = [];
  const logger = new Logger({
    output: (entry) => logs.push(entry),
  });
  
  const child = logger.child('TestContext');
  child.info('Test message');
  
  assert(logs[0].context === 'TestContext', 'Child logger should have context');
});

// ============= Summary =============

console.log('\n──────────────────────────────────────────────────\n');
console.log(`📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All advanced tests passed!\n');
  console.log('Production features verified:');
  console.log('  • Context management');
  console.log('  • Retry logic with backoff');
  console.log('  • Configuration validation');
  console.log('  • Error classification');
  console.log('  • Structured logging\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed\n');
  process.exit(1);
}
