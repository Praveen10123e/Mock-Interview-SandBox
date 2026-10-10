const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../apps/backend/services/interview-service/.env') });

const key = process.env.LLM_API_KEY || '';

async function testCandidate(modelName) {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [{ role: 'user', content: 'Output a valid JSON object: {"status": "ok", "model": "' + modelName + '"}' }],
        max_tokens: 100,
        temperature: 0.1,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    console.log(`[${modelName}] SUCCESS (HTTP ${res.status}):`, res.data?.choices?.[0]?.message?.content);
    return true;
  } catch (err) {
    console.log(`[${modelName}] FAILED:`, err.response?.status, err.response?.data?.error?.message || err.message);
    return false;
  }
}

async function run() {
  await testCandidate('qwen/qwen3.8-27b');
  await testCandidate('openai/gpt-oss-120b');
  await testCandidate('openai/gpt-oss-20b');
}

run();
