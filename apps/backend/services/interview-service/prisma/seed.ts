import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding deterministic interview data...');

  const studentId = 'demo-student-id-1';

  // 1. Practice Interview (Completed)
  await prisma.interview.upsert({
    where: { id: 'practice-completed-1' },
    update: {},
    create: {
      id: 'practice-completed-1',
      identityId: studentId,
      title: 'Practice Session',
      interviewType: 'PRACTICE',
      difficulty: 'MIXED',
      state: 'COMPLETED',
      session: {
        create: {
          id: 'session-practice-completed-1',
          startedAt: new Date(Date.now() - 3600000), // 1 hour ago
          finishedAt: new Date(Date.now() - 3000000), // 50 mins ago
          finalizedAt: new Date(Date.now() - 3000000),
          reportSnapshot: {
            success: true,
            score: 80,
            feedback: "Good work on the coding round."
          },
        }
      }
    }
  });

  // 2. Real Interview (Running)
  await prisma.interview.upsert({
    where: { id: 'real-running-1' },
    update: {},
    create: {
      id: 'real-running-1',
      identityId: studentId,
      title: 'Google SDE-1 Assessment',
      interviewType: 'ASSESSMENT',
      difficulty: 'HARD',
      state: 'RUNNING',
      configuration: {
        create: {
          duration: 90,
          questionCount: 3,
          strictMode: true,
          tabSwitchingAllowed: false,
        }
      },
      session: {
        create: {
          id: 'session-real-running-1',
          startedAt: new Date(Date.now() - 1200000), // 20 mins ago
          timer: {
            create: {
              remainingTime: 4200, // 70 mins left
              elapsedTime: 1200,
            }
          }
        }
      }
    }
  });

  // 3. Failed Attempt
  await prisma.interview.upsert({
    where: { id: 'practice-failed-1' },
    update: {},
    create: {
      id: 'practice-failed-1',
      identityId: studentId,
      title: 'Practice Session - Arrays',
      interviewType: 'PRACTICE',
      difficulty: 'MEDIUM',
      state: 'COMPLETED',
      session: {
        create: {
          id: 'session-practice-failed-1',
          startedAt: new Date(Date.now() - 86400000), // 1 day ago
          finishedAt: new Date(Date.now() - 82800000),
          finalizedAt: new Date(Date.now() - 82800000),
          reportSnapshot: {
            success: false,
            score: 0,
            feedback: "Needs improvement in problem solving."
          },
        }
      }
    }
  });

  // 4. Empty State Scenario
  // We can create a user that has NO interviews. We don't need to do anything, just use a different identityId.
  const emptyStudentId = 'demo-empty-student-1';
  // (No records created for emptyStudentId)

  // 5. Execution Records
  await prisma.interviewExecutionRecord.deleteMany({
    where: { sessionId: 'session-practice-completed-1' }
  });

  await prisma.interviewExecutionRecord.create({
    data: {
      sessionId: 'session-practice-completed-1',
      questionRefId: 'question-ref-1',
      language: '71',
      runMode: 'SUBMIT',
      status: 'PASSED',
      statusDescription: 'Accepted',
      passedCount: 5,
      totalCount: 5,
      score: 100,
      executionTime: 0.05,
      memory: 5000,
      attemptNumber: 1,
      visiblePassedCount: 2,
      hiddenPassedCount: 3,
      visibleTotalCount: 2,
      hiddenTotalCount: 3,
      sourceCodeHash: 'hash-1',
      sourceCodeLength: 100,
      changedFromPrevious: true,
      questionTitle: 'Two Sum',
    }
  });

  await prisma.interviewExecutionRecord.deleteMany({
    where: { sessionId: 'session-practice-failed-1' }
  });

  await prisma.interviewExecutionRecord.create({
    data: {
      sessionId: 'session-practice-failed-1',
      questionRefId: 'question-ref-2',
      language: '71',
      runMode: 'SUBMIT',
      status: 'SUBMITTED_FAILED',
      statusDescription: 'Wrong Answer',
      passedCount: 0,
      totalCount: 5,
      score: 0,
      executionTime: 0.05,
      memory: 5000,
      attemptNumber: 1,
      visiblePassedCount: 0,
      hiddenPassedCount: 0,
      visibleTotalCount: 2,
      hiddenTotalCount: 3,
      sourceCodeHash: 'hash-2',
      sourceCodeLength: 80,
      changedFromPrevious: true,
      questionTitle: 'Reverse Array',
    }
  });

  // 6. Focus Violations
  await prisma.interviewFocusViolation.deleteMany({
    where: { sessionId: 'session-real-running-1' }
  });

  await prisma.interviewFocusViolation.create({
    data: {
      sessionId: 'session-real-running-1',
      violationId: 'violation-1',
      durationMs: 3500,
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
