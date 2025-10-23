# Testing the Cline Framework

This document describes how to test the Cline Framework to ensure it's working correctly.

## Quick Test (No API Key Required)

Run the basic test suite that verifies core functionality without making any API calls:

```bash
npm test
```

This will:
1. Compile the TypeScript code
2. Run automated tests that verify:
   - Module imports work correctly
   - Host adapters can be instantiated
   - Default tools are available
   - Agent can be created
   - MockHost file operations work
   - Tools can execute
   - Event system works

Expected output:
```
🧪 Running Cline Framework Tests

✅ Core modules import correctly
✅ MockHost can be instantiated
✅ Default tools are available
✅ ClineAgent can be instantiated with MockHost
✅ MockHost file operations work
✅ Tools can execute with MockHost
✅ TerminalHost can be instantiated
✅ Agent event system works

📊 Test Results: 8 passed, 0 failed

✅ All tests passed!
```

## Demo Applications (API Key Required)

To test the framework with a real LLM, you'll need an API key.

### 1. Simple Agent Demo

```bash
export ANTHROPIC_API_KEY=your-key-here
npm run demo
```

Or with a custom task:
```bash
node demo/simple-agent.js "Create a hello.txt file with a greeting"
```

### 2. File Operations Demo

```bash
export ANTHROPIC_API_KEY=your-key-here
npm run demo:file-ops
```

This demo:
- Creates a package.json file
- Creates an index.js file
- Lists files in the directory

### 3. Custom Host Demo

```bash
export ANTHROPIC_API_KEY=your-key-here
npm run demo:custom-host
```

This demo shows how to create a custom host adapter that logs all operations.

## Manual Testing

### Test 1: TypeScript Compilation

```bash
npm run build
```

Expected: No errors, outputs JavaScript to `dist/` directory.

### Test 2: Module Imports

```bash
node -e "const { ClineAgent } = require('./dist/core/agent'); console.log('✅ Import works');"
```

Expected: `✅ Import works`

### Test 3: Host Creation

```bash
node -e "const { TerminalHost } = require('./dist/host'); const h = new TerminalHost(); console.log('✅ Host created');"
```

Expected: `✅ Host created`

### Test 4: Agent Creation

```bash
node -e "const { ClineAgent } = require('./dist/core/agent'); const { MockHost } = require('./dist/host'); const agent = new ClineAgent({ apiProvider: 'anthropic', apiKey: 'test', model: 'test', host: new MockHost() }); console.log('✅ Agent created');"
```

Expected: `✅ Agent created`

## Testing Checklist

Use this checklist to verify the framework is fully functional:

- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles TypeScript without errors
- [ ] `npm test` passes all 8 tests
- [ ] Demo shows proper error message when API key is missing
- [ ] With API key: Simple demo executes a task successfully
- [ ] With API key: File operations demo creates files
- [ ] With API key: Custom host demo logs operations

## Troubleshooting

### TypeScript Compilation Errors

If you see TypeScript errors:
1. Delete `node_modules` and `dist` directories
2. Run `npm install`
3. Run `npm run build`

### Module Not Found Errors

If you see "Cannot find module" errors:
1. Ensure you've run `npm run build` first
2. Check that `dist/` directory exists and contains `.js` files

### API Key Issues

If demos don't work with your API key:
1. Verify the API key is set: `echo $ANTHROPIC_API_KEY`
2. Check the API key is valid in your Anthropic dashboard
3. Try with a different model (edit the demo file)

### Permission Errors

If you get permission errors:
1. Ensure the script is executable: `chmod +x test/basic-test.js`
2. Or run with node: `node test/basic-test.js`

## CI/CD Testing

For automated testing in CI/CD pipelines:

```bash
# Install dependencies
npm install

# Run tests (no API key needed)
npm test

# If tests pass, the framework is working
```

## Test Coverage

The test suite covers:

1. **Module Loading**: All core modules import correctly
2. **Host Adapters**: Both Terminal and Mock hosts work
3. **Tools**: All 6 built-in tools are available
4. **Agent Creation**: Agent can be instantiated
5. **File Operations**: Mock file system works
6. **Tool Execution**: Tools can execute with context
7. **Event System**: Event emitters work correctly
8. **Type Safety**: TypeScript compilation succeeds

## Integration Testing

To test integration with your own application:

```javascript
const { ClineAgent } = require('@cline/framework');
const { TerminalHost } = require('@cline/framework/host');

const agent = new ClineAgent({
  apiProvider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  host: new TerminalHost()
});

agent.executeTask('Your task here')
  .then(result => console.log('Success:', result.status))
  .catch(error => console.error('Error:', error));
```

## Performance Testing

The framework is lightweight and should have minimal overhead:

- Package size: ~40KB
- Startup time: < 100ms
- Memory usage: < 50MB (excluding LLM API calls)

## Security Testing

Before deploying to production:

1. Never commit API keys to version control
2. Use environment variables for sensitive data
3. Validate all user inputs before passing to tools
4. Review custom tools for security vulnerabilities
5. Keep dependencies updated

## Next Steps

After verifying the framework works:

1. Read the [API documentation](../docs/API.md)
2. Learn how to [create custom tools](../docs/CUSTOM_TOOLS.md)
3. Review the [architecture guide](../ARCHITECTURE.md)
4. Build your own agent application!

---

For issues or questions, see the main [README](../README.md).
