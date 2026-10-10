const axios = require('axios');

const questionId = 'e9f3776f-edab-4463-a8c4-4f9b8e12ca72'; // Trapping Rain Water
const headers = { 'x-identity-id': 'student-test-1' };

const buildPayload = (sourceCode, languageId = 71) => ({
  executionMode: 'PRACTICE',
  sourceCode,
  languageId,
  questionRefId: questionId,
  customInput: ''
});

async function post(payload) {
  const r = await axios.post('http://localhost:3004/practice-test/execute', payload, { headers, timeout: 90000 });
  return r.data;
}

async function testCase(name, payload, expectKey) {
  console.log(`\n=== TEST: ${name} ===`);
  try {
    const res = await post(payload);
    console.log('success:', res.success);
    console.log('errorType:', res.errorType);
    console.log('status:', res.status?.description);
    console.log('results:', res.results ? res.results.length + ' result(s), passed=' + res.results.filter(function(r){ return r.passed; }).length : 'none');
    console.log('time:', res.time, '| memory:', res.memory);
    if (res.errorType) console.log('message:', (res.message || '').substring(0, 200));
    if (expectKey) {
      const passed = res[expectKey] !== undefined || (expectKey === 'results' && res.results);
      console.log('Expected key ' + expectKey + ':', passed ? 'PRESENT ✓' : 'MISSING ✗');
    }
  } catch(e) {
    console.error('ERROR:', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }
}

async function run() {
  // Test 1: Correct Python solution
  const correctPython = 'def trap(height):\n    left, right = 0, len(height) - 1\n    left_max, right_max, water = 0, 0, 0\n    while left < right:\n        if height[left] <= height[right]:\n            if height[left] >= left_max: left_max = height[left]\n            else: water += left_max - height[left]\n            left += 1\n        else:\n            if height[right] >= right_max: right_max = height[right]\n            else: water += right_max - height[right]\n            right -= 1\n    return water';
  
  await testCase('PYTHON - Correct solution (should pass all tests)', buildPayload(correctPython), 'results');

  // Test 2: Wrong function name (WRAPPER_ERROR)
  const wrongName = 'def wrongName(height):\n    return 6';
  await testCase('PYTHON - Wrong function name (should get WRAPPER_ERROR)', buildPayload(wrongName), 'errorType');

  // Test 3: Syntax error (COMPILATION_ERROR)
  const syntaxError = 'def trap(height)\n    return 6';
  await testCase('PYTHON - Syntax error (should get COMPILATION_ERROR)', buildPayload(syntaxError), 'errorType');

  // Test 4: Wrong answer (returns wrong value)
  const wrongAnswer = 'def trap(height):\n    return 999';
  await testCase('PYTHON - Wrong answer (should fail test cases)', buildPayload(wrongAnswer), 'results');
}

run().then(function() {
  console.log('\n=== ALL TESTS COMPLETE ===');
}).catch(function(e) {
  console.error('Fatal error:', e.message);
});
