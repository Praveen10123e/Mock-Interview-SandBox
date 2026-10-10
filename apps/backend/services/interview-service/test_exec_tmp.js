const axios = require('axios');
async function run() {
  const questionId = 'e9f3776f-edab-4463-a8c4-4f9b8e12ca72';
  
  const sourceCode = [
    'def trap(height):',
    '    left = 0',
    '    right = len(height) - 1',
    '    left_max = 0',
    '    right_max = 0',
    '    water = 0',
    '    while left < right:',
    '        if height[left] <= height[right]:',
    '            if height[left] >= left_max:',
    '                left_max = height[left]',
    '            else:',
    '                water += left_max - height[left]',
    '            left += 1',
    '        else:',
    '            if height[right] >= right_max:',
    '                right_max = height[right]',
    '            else:',
    '                water += right_max - height[right]',
    '            right -= 1',
    '    return water'
  ].join('\n');

  console.log('=== SENDING TO INTERVIEW SERVICE (port 3004) ===');
  const payload = {
    executionMode: 'PRACTICE',
    sourceCode,
    languageId: 71,
    questionRefId: questionId,
    customInput: ''
  };
  console.log('Payload keys:', Object.keys(payload));
  
  try {
    const r = await axios.post('http://localhost:3004/practice-test/execute', payload, {
      headers: { 'x-identity-id': 'student-test-1' },
      timeout: 90000
    });
    
    console.log('=== RESPONSE FROM INTERVIEW SERVICE ===');
    console.log('HTTP status:', r.status);
    console.log('Response:', JSON.stringify(r.data, null, 2));
  } catch(e) {
    console.error('ERROR:', e.response?.status, JSON.stringify(e.response?.data || e.message));
  }
}
run();
