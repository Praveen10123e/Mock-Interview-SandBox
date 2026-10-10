import axios from 'axios';
import https from 'https';
import dns from 'dns';

// Fallback to Judge0 Community Edition endpoint if no explicit config is provided
const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_HOST = process.env.JUDGE0_API_HOST || '';

// Custom lookup to prioritize fast, responsive IPv4 address for ce.judge0.com
// On Windows networks, ce.judge0.com returns an IPv6 address and 104.21.77.82, which frequently hangs/drops packets.
// 172.67.205.188 is Cloudflare's responsive IPv4 node.
function fastLookup(hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'ce.judge0.com') {
    if (options && options.all) {
      return callback(null, [{ address: '172.67.205.188', family: 4 }]);
    }
    return callback(null, '172.67.205.188', 4);
  }
  return dns.lookup(hostname, options, callback);
}

const httpsAgent = new https.Agent({
  lookup: fastLookup,
  keepAlive: true,
  maxSockets: 30,
});

const headers: any = {
  'content-type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MockInterviewPlatform/1.0',
};

if (JUDGE0_KEY && JUDGE0_HOST) {
  headers['X-RapidAPI-Key'] = JUDGE0_KEY;
  headers['X-RapidAPI-Host'] = JUDGE0_HOST;
}

const judgeClient = axios.create({
  baseURL: JUDGE0_URL,
  headers,
  httpsAgent,
  timeout: 20000,
});

function decodeBase64Fields(data: any) {
  if (!data) return data;
  if (data.stdout && typeof data.stdout === 'string') data.stdout = Buffer.from(data.stdout, 'base64').toString('utf8');
  if (data.stderr && typeof data.stderr === 'string') data.stderr = Buffer.from(data.stderr, 'base64').toString('utf8');
  if (data.compile_output && typeof data.compile_output === 'string') data.compile_output = Buffer.from(data.compile_output, 'base64').toString('utf8');
  if (data.message && typeof data.message === 'string') data.message = Buffer.from(data.message, 'base64').toString('utf8');
  return data;
}

export class Judge0Client {
  /**
   * Submit code for execution with wait=true for synchronous fast-path.
   * If Judge0 finishes within the wait window, returns the decoded submission object directly.
   * If still processing or queued, returns decoded submission with token for polling.
   */
  static async submitCode(sourceCode: string, languageId: number, stdin?: string) {
    const payload = {
      source_code: Buffer.from(sourceCode).toString('base64'),
      language_id: languageId,
      stdin: (stdin !== undefined && stdin !== null && stdin !== '') ? Buffer.from(stdin).toString('base64') : '',
    };

    try {
      const response = await judgeClient.post(
        '/submissions?base64_encoded=true&wait=true',
        payload
      );
      return decodeBase64Fields(response.data);
    } catch (err: any) {
      // If wait=true fails due to timeout on long execution, fallback to wait=false to obtain a token
      if (err.response?.status === 504 || err.code === 'ECONNABORTED') {
        const fallbackResponse = await judgeClient.post(
          '/submissions?base64_encoded=true&wait=false',
          payload
        );
        return decodeBase64Fields(fallbackResponse.data);
      }
      throw err;
    }
  }

  /**
   * Fetch the result of an execution using the token.
   */
  static async getSubmission(token: string) {
    const response = await judgeClient.get(`/submissions/${token}?base64_encoded=true&fields=*`);
    return decodeBase64Fields(response.data);
  }

  /**
   * Get all active languages supported by Judge0.
   */
  static async getLanguages() {
    try {
      const response = await judgeClient.get('/languages');
      return response.data;
    } catch (err: any) {
      console.warn('Judge0 API failed (likely invalid key), returning fallback languages.');
      return [
        { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
        { id: 71, name: 'Python (3.8.1)' },
        { id: 54, name: 'C++ (GCC 9.2.0)' },
        { id: 62, name: 'Java (OpenJDK 13.0.1)' }
      ];
    }
  }
}

