const fs = require('fs');

function runTests() {
  let rawInput = '';
  try {
    rawInput = fs.readFileSync(0, 'utf-8');
  } catch (err) {
    console.log(JSON.stringify({ status: 'RUNTIME_ERROR', error_message: 'Failed to read stdin' }));
    return;
  }

  if (!rawInput.trim()) {
    console.log(JSON.stringify({ status: 'RUNTIME_ERROR', error_message: 'Empty payload' }));
    return;
  }

  const payload = JSON.parse(rawInput);
  const userCode = payload.code || '';
  const testCases = payload.test_cases || [];

  const startTime = Date.now();
  let userModule = {};

  try {
    // Eval in isolated scope
    const evalFunc = new Function('exports', userCode + '\nreturn exports;');
    userModule = evalFunc(userModule);
  } catch (err) {
    console.log(JSON.stringify({
      status: 'COMPILE_ERROR',
      error_message: `Syntax/Compile Error: ${err.message}`,
      execution_time_ms: Date.now() - startTime
    }));
    return;
  }

  let targetFunc = null;
  if (typeof userModule === 'function') {
    targetFunc = userModule;
  } else if (typeof userModule === 'object') {
    const keys = Object.keys(userModule);
    if (keys.length > 0 && typeof userModule[keys[0]] === 'function') {
      targetFunc = userModule[keys[0]];
    }
  }

  if (!targetFunc) {
    // Try scanning global scope for function declaration
    try {
      const match = userCode.match(/function\s+([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        const globalFunc = new Function(userCode + `; return ${match[1]};`);
        targetFunc = globalFunc();
      }
    } catch (e) {}
  }

  if (!targetFunc) {
    console.log(JSON.stringify({
      status: 'RUNTIME_ERROR',
      error_message: 'No exported or declared function found in submission code.',
      execution_time_ms: Date.now() - startTime
    }));
    return;
  }

  let passedCount = 0;
  const totalCount = testCases.length;
  let firstFailure = '';

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const inputs = tc.input;
    const expected = tc.expected_output;

    try {
      let result;
      if (Array.isArray(inputs)) {
        result = targetFunc(...inputs);
      } else if (typeof inputs === 'object' && inputs !== null) {
        result = targetFunc(...Object.values(inputs));
      } else {
        result = targetFunc(inputs);
      }

      if (JSON.stringify(result) === JSON.stringify(expected)) {
        passedCount++;
      } else {
        if (!firstFailure) {
          firstFailure = `Test Case ${i + 1} Failed: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`;
        }
      }
    } catch (err) {
      if (!firstFailure) {
        firstFailure = `Test Case ${i + 1} Runtime Error: ${err.message}`;
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const status = passedCount === totalCount ? 'PASSED' : 'FAILED';

  console.log(JSON.stringify({
    status: status,
    passed_count: passedCount,
    total_count: totalCount,
    execution_time_ms: executionTimeMs,
    output: '',
    error_message: firstFailure
  }));
}

runTests();
