const fs = require('fs');
const path = require('path');

const CURATED_DIR = path.join(__dirname, '../data/curated');
const CODING_FILE = path.join(CURATED_DIR, 'full_program_coding_interview_dataset_40(3).json');
const APTITUDE_FILE = path.join(CURATED_DIR, 'aptitude.json');
const HR_FILE = path.join(CURATED_DIR, 'hr.json');

function validateCoding() {
  console.log('--- Validating full_program_coding_interview_dataset_40(3).json ---');
  if (!fs.existsSync(CODING_FILE)) throw new Error('full_program_coding_interview_dataset_40(3).json missing');
  
  const data = JSON.parse(fs.readFileSync(CODING_FILE, 'utf8'));
  const problems = data.problems || data.questions;
  
  if (data.dataset_name !== 'Full-Program Coding Interview Dataset') throw new Error('Invalid dataset_name');
  if (problems.length !== 40) throw new Error(`Expected 40 questions, found ${problems.length}`);
  
  const ids = new Set();
  const diffCounts = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach((p) => {
    if (ids.has(p.problem_id)) throw new Error(`Duplicate ID: ${p.problem_id}`);
    ids.add(p.problem_id);
    if (!p.title || !p.description) throw new Error(`Missing title/description for ${p.problem_id}`);
    if (!p.examples || !Array.isArray(p.examples) || p.examples.length === 0) throw new Error(`Missing examples for ${p.problem_id}`);
    if (!p.hidden_test_cases || !Array.isArray(p.hidden_test_cases) || p.hidden_test_cases.length === 0) throw new Error(`Missing hidden_test_cases for ${p.problem_id}`);
    if (p.candidate_starter_code !== 'empty') throw new Error(`Expected empty starter code for ${p.problem_id}`);
    if (p.submission_format !== 'full_program') throw new Error(`Expected full_program submission format for ${p.problem_id}`);
    if (!['Easy', 'Medium', 'Hard'].includes(p.difficulty)) throw new Error(`Invalid difficulty for ${p.problem_id}`);
    diffCounts[p.difficulty] = (diffCounts[p.difficulty] || 0) + 1;
  });
  
  console.log(`✅ full_program_coding_interview_dataset_40(3).json valid. (40 questions: ${diffCounts.Easy} Easy, ${diffCounts.Medium} Medium, ${diffCounts.Hard} Hard)`);
  return 40;
}

function validateAptitude() {
  console.log('--- Validating aptitude.json ---');
  if (!fs.existsSync(APTITUDE_FILE)) throw new Error('aptitude.json missing');
  
  const data = JSON.parse(fs.readFileSync(APTITUDE_FILE, 'utf8'));
  const questions = data.questions;
  
  if (data.datasetName !== 'Curated Aptitude Set v1') throw new Error('Invalid datasetName');
  if (data.questionType !== 'APTITUDE') throw new Error('Invalid questionType');
  if (questions.length !== 15) throw new Error(`Expected 15 questions, found ${questions.length}`);
  
  const ids = new Set();
  questions.forEach((q) => {
    if (ids.has(q.id)) throw new Error(`Duplicate ID: ${q.id}`);
    ids.add(q.id);
    if (!q.id.startsWith('APT-')) throw new Error(`Invalid ID prefix: ${q.id}`);
    if (!q.question) throw new Error(`Missing question for ${q.id}`);
    if (!q.options || !Array.isArray(q.options)) throw new Error(`Missing options for ${q.id}`);
    if (typeof q.correctOptionIndex !== 'number') throw new Error(`Missing correctOptionIndex for ${q.id}`);
    if (!q.explanation) throw new Error(`Missing explanation for ${q.id}`);
  });
  
  console.log('✅ aptitude.json valid. (15 questions)');
  return 15;
}

function validateHR() {
  console.log('--- Validating hr.json ---');
  if (!fs.existsSync(HR_FILE)) throw new Error('hr.json missing');
  
  const data = JSON.parse(fs.readFileSync(HR_FILE, 'utf8'));
  const questions = data.questions;
  
  if (data.datasetName !== 'Curated HR Set v1') throw new Error('Invalid datasetName');
  if (data.questionType !== 'HR') throw new Error('Invalid questionType');
  if (questions.length !== 10) throw new Error(`Expected 10 questions, found ${questions.length}`);
  
  const ids = new Set();
  questions.forEach((q) => {
    if (ids.has(q.id)) throw new Error(`Duplicate ID: ${q.id}`);
    ids.add(q.id);
    if (!q.id.startsWith('HR-')) throw new Error(`Invalid ID prefix: ${q.id}`);
    if (!q.question) throw new Error(`Missing question for ${q.id}`);
    if (!q.evaluationCriteria || !Array.isArray(q.evaluationCriteria)) throw new Error(`Missing evaluationCriteria for ${q.id}`);
  });
  
  console.log('✅ hr.json valid. (10 questions)');
  return 10;
}

async function run() {
  try {
    let total = 0;
    total += validateCoding();
    total += validateAptitude();
    total += validateHR();
    console.log(`\n🎉 Success! Total verified questions: ${total} (Expected: 65)`);
  } catch (err) {
    console.error(`\n❌ Validation Failed: ${err.message}`);
    process.exit(1);
  }
}

run();
