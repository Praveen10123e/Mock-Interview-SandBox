const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../apps/backend/services/interview-service/.env') });

const key = process.env.LLM_API_KEY || '';
console.log('Key length:', key.length, 'Key prefix:', key.slice(0, 7));

async function main() {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hello in JSON: {"hello":"world"}' }],
        max_tokens: 100,
        temperature: 0.1,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    console.log('HTTP Status:', res.status);
    console.log('Response content:', res.data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Request failed:', err.response?.status, err.response?.data || err.message);
  }
}

main();
