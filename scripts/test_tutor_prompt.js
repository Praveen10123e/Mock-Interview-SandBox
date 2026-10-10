const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../apps/backend/services/interview-service/.env') });

const key = process.env.LLM_API_KEY || '';

const systemPrompt = `You are an expert DSA tutor and competitive programming coach. Your role is to provide EDUCATIONAL analysis of a candidate's coding submission, NOT just to correct it.

CRITICAL RULES YOU MUST FOLLOW:
1. You MUST explain the candidate's ACTUAL submitted code — do NOT replace it silently.
2. You are NOT the judge. The authoritative execution result is provided. Do NOT override it.
3. submissionStatus is determined by the judge — accept it as ground truth.
4. If submissionStatus is ACCEPTED: correction.required = false, correction.correctedCode = null.
5. If submissionStatus is INCORRECT/COMPILATION_ERROR/RUNTIME_ERROR: correction.required = true, provide correctedCode.
6. correctedCode MUST be a COMPLETE executable stdin/stdout program in python — never pseudocode or snippets.
7. bruteForce.code and optimalApproach.code MUST be COMPLETE executable programs in python.
8. Derive complexity from the candidate's ACTUAL code — NEVER contradict the code.
9. Consider expected problem complexity (Time: O(n log n), Space: O(1)) as problem context, but derive candidate complexity from their actual implementation.
10. Do NOT invent test results, scores, or execution data.
11. Respond ONLY with a valid JSON object — no markdown fences, no text outside JSON.
12. Properly escape all strings: use \\n for newlines inside JSON string values.
13. If correctedCode or brute-force code is unavailable, set to null — never use placeholders.

REQUIRED JSON SCHEMA:
{
  "submissionAnalysis": {
    "verdict": "INCORRECT — 1/4 tests passed",
    "explanation": "The submission failed on 3 test cases.",
    "candidateApproach": "Linear Iteration",
    "codeExplanation": "The candidate attempts to sort or select elements.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "bruteForce": {
    "available": true,
    "idea": "Sort the entire array and take the first K elements.",
    "steps": ["Read input", "Sort list", "Print first k elements"],
    "code": "import sys\\nlines = sys.stdin.read().split()\\n...",
    "timeComplexity": "O(n log n)",
    "spaceComplexity": "O(n)"
  },
  "optimalApproach": {
    "idea": "Use a Max-Heap of size K to maintain the K smallest elements in O(n log k).",
    "steps": ["Read input", "Maintain max heap", "Print elements"],
    "code": "import sys, heapq\\n...",
    "timeComplexity": "O(n log k)",
    "spaceComplexity": "O(k)",
    "whyOptimal": "Avoids full array sort"
  },
  "correction": {
    "required": true,
    "rootCause": "The code printed descending instead of ascending or failed to handle k elements.",
    "correctedCode": "import sys\\nlines = sys.stdin.read().split()\\nif not lines: sys.exit(0)\\nn = int(lines[0])\\nk = int(lines[1])\\narr = [int(x) for x in lines[2:2+n]]\\narr.sort()\\nprint(*(arr[:k]))",
    "explanation": "Sorts the array and takes the first k elements."
  },
  "optimizationReview": {
    "status": "CAN_BE_OPTIMIZED",
    "explanation": "Current approach can be optimized."
  },
  "keyConcept": "K-selection and Heap data structures",
  "bugPrevention": "Double-check sort order and k-bounds."
}`;

const userPrompt = `=== PROBLEM ===
Title: K Smallest Values
Difficulty: Medium
Pattern/Topic: Sorting & Selection
Expected Optimal Time Complexity: O(n log k)
Expected Optimal Space Complexity: O(k)

=== CANDIDATE SUBMISSION ===
Language: python
Submission Status (AUTHORITATIVE — from judge): INCORRECT — 1/4 tests passed

Candidate's Submitted Code:
\`\`\`python
import sys
lines = sys.stdin.read().split()
if lines:
    print("5 4 3 2 1")
\`\`\`

=== FAILED TEST EVIDENCE (authoritative) ===
Failed Test 1:
  Input: 4\\n-2 0 5 9
  Expected: 9 5 0 -2
  Actual: 5 4 3 2 1

Provide a complete educational DSA tutor analysis as per the JSON schema.`;

async function testPrompt(modelName) {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const raw = res.data?.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[${modelName}] RAW LENGTH:`, raw.length);
    let jsonStr = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    else {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) jsonStr = raw.substring(start, end + 1);
    }
    const parsed = JSON.parse(jsonStr);
    console.log(`[${modelName}] PARSED SUCCESS! Keys:`, Object.keys(parsed));
    console.log(`[${modelName}] verdict:`, parsed.submissionAnalysis?.verdict);
    console.log(`[${modelName}] rootCause:`, parsed.correction?.rootCause);
    return true;
  } catch (err) {
    console.error(`[${modelName}] FAILED:`, err.response?.status, err.response?.data || err.message);
    return false;
  }
}

async function run() {
  console.log('Testing openai/gpt-oss-120b...');
  await testPrompt('openai/gpt-oss-120b');
  console.log('\nTesting qwen/qwen3.8-27b...');
  await testPrompt('qwen/qwen3.8-27b');
}

run();
