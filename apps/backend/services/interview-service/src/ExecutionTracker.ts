import { PrismaClient } from './generated/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function toFloat(val: any, fallback = 0): number {
  if (val !== null && val !== undefined && val !== '') {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

function toInt(val: any, fallback = 0): number {
  if (val !== null && val !== undefined && val !== '') {
    const num = parseInt(String(val), 10);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

export async function recordExecution(
  sessionId: string,
  questionRefId: string,
  languageId: number,
  runMode: 'RUN' | 'SUBMIT',
  sourceCode: string,
  judgeResult: any,
  questionMeta: any
) {
  // RUN mode is for quick validation only.
  // It must NOT create an immutable submission attempt, affect score, or affect Best Result.
  if (runMode !== 'SUBMIT') {
    return;
  }

  const passedCount = toInt(judgeResult.passedCount, 0);
  const totalCount = toInt(judgeResult.totalCount, 0);

  let primaryErrorType = judgeResult.errorType || null;
  let statusDesc = judgeResult.status?.description || judgeResult.statusDescription || 'Unknown';

  if (judgeResult.compileOutput || judgeResult.compile_output) {
    primaryErrorType = 'COMPILATION_ERROR';
    statusDesc = 'Compilation Error';
  }

  // Detect runtime or compilation errors across test cases
  if (judgeResult.results && Array.isArray(judgeResult.results)) {
    for (const r of judgeResult.results) {
      const desc = r.status?.description || r.status || '';
      const out = r.studentOutput || r.actualOutput || r.stdout || '';
      if (
        (typeof desc === 'string' && desc.includes('Runtime Error')) ||
        (typeof out === 'string' && (out.includes('Traceback (most recent call last)') || out.includes('RuntimeError') || out.includes('Exception')))
      ) {
        primaryErrorType = 'RUNTIME_ERROR';
        statusDesc = 'Runtime Error';
        break;
      } else if (typeof desc === 'string' && desc.includes('Compilation Error')) {
        primaryErrorType = 'COMPILATION_ERROR';
        statusDesc = 'Compilation Error';
        break;
      } else if (typeof desc === 'string' && desc.includes('Time Limit')) {
        primaryErrorType = 'TIME_LIMIT_EXCEEDED';
        statusDesc = 'Time Limit Exceeded';
        break;
      } else if (typeof desc === 'string' && desc.includes('Memory Limit')) {
        primaryErrorType = 'MEMORY_LIMIT_EXCEEDED';
        statusDesc = 'Memory Limit Exceeded';
        break;
      }
    }
  }

  let status = 'FAILED';
  if (primaryErrorType === 'COMPILATION_ERROR' || statusDesc.includes('Compilation Error')) {
    status = 'COMPILATION_ERROR';
    primaryErrorType = 'COMPILATION_ERROR';
  } else if (primaryErrorType === 'RUNTIME_ERROR' || statusDesc.includes('Runtime Error')) {
    status = 'RUNTIME_ERROR';
    primaryErrorType = 'RUNTIME_ERROR';
  } else if (primaryErrorType === 'TIME_LIMIT_EXCEEDED') {
    status = 'TIME_LIMIT_EXCEEDED';
  } else if (primaryErrorType === 'MEMORY_LIMIT_EXCEEDED') {
    status = 'MEMORY_LIMIT_EXCEEDED';
  } else if (passedCount === totalCount && totalCount > 0) {
    status = 'ACCEPTED';
  } else if (passedCount > 0 && passedCount < totalCount) {
    status = 'PARTIALLY_SOLVED';
  } else {
    status = 'WRONG_ANSWER';
  }

  const visiblePassedCount = toInt(passedCount, 0);
  const visibleTotalCount = toInt(totalCount, 0);

  const sourceCodeHash = crypto.createHash('sha256').update(sourceCode || '').digest('hex');
  const sourceCodeLength = sourceCode?.length || 0;

  // Safe numeric field conversions
  const score = toFloat(judgeResult.score, 0);
  const executionTime = toFloat(judgeResult.time ?? judgeResult.executionTime, 0);
  const memory = toFloat(judgeResult.memory, 0);

  // Transaction to safely generate attemptNumber and upsert final result
  await prisma.$transaction(async (tx) => {
    const prevAttempts = await tx.interviewExecutionRecord.findMany({
      where: { sessionId, questionRefId, runMode: 'SUBMIT' },
      orderBy: { attemptNumber: 'desc' },
      take: 1
    });

    const nextAttempt = prevAttempts.length > 0 ? prevAttempts[0].attemptNumber + 1 : 1;
    const changedFromPrevious = prevAttempts.length > 0 ? prevAttempts[0].sourceCodeHash !== sourceCodeHash : true;

    // Create immutable submission attempt record
    const record = await tx.interviewExecutionRecord.create({
      data: {
        sessionId,
        questionRefId,
        language: String(languageId),
        runMode: 'SUBMIT',
        status,
        statusDescription: statusDesc,
        passedCount,
        totalCount,
        score,
        executionTime,
        memory,
        compileOutput: judgeResult.compile_output || judgeResult.compileOutput || null,
        stdout: judgeResult.stdout || null,
        stderr: judgeResult.stderr || judgeResult.message || null,
        testCaseResults: judgeResult.results || null,
        primaryErrorType,
        attemptNumber: nextAttempt,
        visiblePassedCount,
        hiddenPassedCount: 0,
        visibleTotalCount,
        hiddenTotalCount: 0,
        sourceCode: sourceCode || null,
        sourceCodeHash,
        sourceCodeLength: toInt(sourceCodeLength, 0),
        changedFromPrevious,
        questionTitle: questionMeta?.title || 'Unknown Question',
        questionTopic: typeof questionMeta?.topic === 'string' ? questionMeta.topic : (questionMeta?.topic?.name || null),
        questionTags: questionMeta?.tags || [],
        questionDifficulty: questionMeta?.difficulty || 'Medium'
      }
    });

    // Update Question Result (Deterministic Best Result from SUBMIT attempts)
    const existingResult = await tx.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId, questionRefId } }
    });

    let newFinalStatus = status;
    let newFinalScore = toFloat(record.score, 0);
    let newTotalScore = toFloat(judgeResult.totalScore, 0);
    let newPassedCount = passedCount;
    let newTotalCount = toInt(record.totalCount, 0);
    let latestSubmitRecordId = record.id;

    if (existingResult?.latestSubmitRecordId) {
      const prevPassed = toInt(existingResult.passedCount, -1);
      // Deterministic Best Result rule: Highest passedCount wins; if tied, latest attempt wins
      if (passedCount < prevPassed) {
        newFinalStatus = existingResult.finalStatus;
        newFinalScore = existingResult.finalScore;
        newTotalScore = existingResult.totalScore;
        newPassedCount = existingResult.passedCount;
        newTotalCount = existingResult.totalCount;
        latestSubmitRecordId = existingResult.latestSubmitRecordId;
      }
    }

    await tx.interviewQuestionResult.upsert({
      where: { sessionId_questionRefId: { sessionId, questionRefId } },
      create: {
        sessionId,
        questionRefId,
        finalStatus: newFinalStatus,
        finalScore: newFinalScore,
        totalScore: newTotalScore,
        passedCount: newPassedCount,
        totalCount: newTotalCount,
        latestSubmitRecordId
      },
      update: {
        finalStatus: newFinalStatus,
        finalScore: newFinalScore,
        totalScore: newTotalScore,
        passedCount: newPassedCount,
        totalCount: newTotalCount,
        latestSubmitRecordId
      }
    });
  });
}
