const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../apps/backend/services/interview-service/.env') });

const key = process.env.LLM_API_KEY || '';

async function listModels() {
  try {
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    console.log('Available models on Groq:');
    const ids = res.data?.data?.map(m => m.id);
    console.log(ids);
  } catch (err) {
    console.error('List models failed:', err.response?.status, err.response?.data || err.message);
  }
}

listModels();
