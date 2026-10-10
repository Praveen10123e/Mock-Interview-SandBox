import { PrismaClient as InterviewPrismaClient } from '../generated/client';
import axios from 'axios';

let _prisma: InterviewPrismaClient;
const prisma = new Proxy({} as InterviewPrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new InterviewPrismaClient();
    return (_prisma as any)[prop];
  },
});

const USER_DB_URL = process.env.USER_DATABASE_URL || "postgresql://postgres:9865@localhost:5432/user_db?schema=public";
const AUTH_DB_URL = process.env.AUTH_DATABASE_URL || "postgresql://postgres:9865@localhost:5432/auth_db?schema=public";

// Reuse database connections to user and auth tables
let _userPrisma: any = null;
function getUserPrisma() {
  if (!_userPrisma) {
    try {
      const { PrismaClient: UserPrismaClient } = require('../../../user-service/src/generated/client');
      _userPrisma = new UserPrismaClient({
        datasources: {
          db: {
            url: USER_DB_URL,
          },
        },
      });
    } catch {
      _userPrisma = null;
    }
  }
  return _userPrisma;
}

let _authPrisma: any = null;
function getAuthPrisma() {
  if (!_authPrisma) {
    try {
      const { PrismaClient: AuthPrismaClient } = require('../../../auth-service/src/generated/client');
      _authPrisma = new AuthPrismaClient({
        datasources: {
          db: {
            url: AUTH_DB_URL,
          },
        },
      });
    } catch {
      _authPrisma = null;
    }
  }
  return _authPrisma;
}

const QUESTION_BANK_URL = process.env.QUESTION_BANK_SERVICE_URL || 'http://localhost:3005';

export interface FacultyInterviewListItem {
  id: string;
  interviewId: string;
  student: {
    identityId: string;
    profileId?: string | null;
    fullName: string;
    email: string;
    department?: string;
    college?: string;
    batch?: string;
    rollNumber?: string;
  };
  template: {
    id?: string | null;
    name: string;
    interviewType: string;
    difficulty: string;
    selectionMode: string;
  };
  stages: {
    aptitude: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      totalQuestions: number;
      attemptedCount: number;
      correctCount?: number | null;
      score?: number | null;
    };
    coding: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      totalProblems: number;
      attemptedCount: number;
      passedProblems: number;
      totalSubmissions: number;
      score?: number | null;
    };
    hr: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      mode: string;
      interactionsCount: number;
      evaluated: boolean;
      score?: number | null;
    };
  };
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EVALUATED';
  overallScore: number | null;
  scoreDisplay: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface FacultyStudentInterviewSummary {
  student: {
    identityId: string;
    profileId?: string | null;
    fullName: string;
    email: string;
    department?: string;
    college?: string;
    batch?: string;
    rollNumber?: string;
  };
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  abandonedSessions: number;
  averageScore: number | null;
  averageScoreDisplay: string;
  latestSessionAt: string | null;
  sessions: FacultyInterviewListItem[];
}

export class FacultyInterviewService {
  /**
   * Fetch all real student identities and profiles directly from database
   */
  private static async getStudentUsersMap(): Promise<Map<string, any>> {
    const studentMap = new Map<string, any>();
    const userPrisma = getUserPrisma();
    const authPrisma = getAuthPrisma();

    try {
      // 1. Fetch identities with role STUDENT from auth_db
      if (authPrisma) {
        try {
          const identities = await authPrisma.identity.findMany({
            where: {
              roles: {
                some: {
                  role: { name: { in: ['STUDENT', 'CANDIDATE'] } },
                },
                none: {
                  role: { name: { in: ['FACULTY', 'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'] } },
                },
              },
            },
            select: { id: true, email: true },
          });

          identities.forEach((i: any) => {
            const lower = (i.email || '').toLowerCase().trim();
            const isTest = /^(student_arun_|praveen_sync_|test_profile_)/.test(lower) || /_178\d{7,}|\.178\d{7,}/.test(lower);
            if (isTest) return;

            const prefix = i.email.split('@')[0].replace(/[._0-9]+/g, ' ').trim();
            const fullName = prefix
              .split(' ')
              .filter(Boolean)
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ') || 'Student';

            studentMap.set(i.id, {
              identityId: i.id,
              profileId: null,
              fullName,
              email: i.email,
              department: 'Computer Science & Engineering',
              college: 'Naan Mudhalvan Partner College',
              batch: '2028',
              rollNumber: 'STU-' + i.id.substring(0, 4).toUpperCase(),
              role: 'STUDENT',
            });
          });
        } catch (e: any) {
          console.warn('[FacultyInterviewService] Identity query warn:', e.message);
        }
      }

      // 2. Hydrate from user_db profiles if available (strictly matching genuine student identities)
      if (userPrisma && studentMap.size > 0) {
        try {
          const studentIdentityIds = Array.from(studentMap.keys());
          const profiles = await userPrisma.profile.findMany({
            where: {
              identityId: { in: studentIdentityIds },
              facultyProfile: null,
              adminProfile: null,
            },
            include: {
              studentProfile: true,
              nmProfile: true,
            },
          });

          profiles.forEach((p: any) => {
            const existing = studentMap.get(p.identityId);
            if (!existing) return;

            const rawName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            const fullName = (rawName && rawName !== 'New User' && rawName !== 'Student')
              ? rawName
              : existing.fullName;

            existing.profileId = p.id;
            existing.fullName = fullName;
            if (p.studentProfile?.department) existing.department = p.studentProfile.department;
            else if (p.nmProfile?.department) existing.department = p.nmProfile.department;

            if (p.studentProfile?.college) existing.college = p.studentProfile.college;
            else if (p.nmProfile?.institution) existing.college = p.nmProfile.institution;

            if (p.studentProfile?.batch) existing.batch = p.studentProfile.batch;
            else if (p.nmProfile?.batch) existing.batch = p.nmProfile.batch;

            if (p.studentProfile?.rollNumber || p.studentProfile?.registerNumber) {
              existing.rollNumber = p.studentProfile.rollNumber || p.studentProfile.registerNumber;
            } else if (p.nmProfile?.studentId) {
              existing.rollNumber = p.nmProfile.studentId;
            }
          });
        } catch (e: any) {
          console.warn('[FacultyInterviewService] Profile query warn:', e.message);
        }
      }
    } catch (err: any) {
      console.warn('[FacultyInterviewService] getStudentUsersMap error:', err.message);
    }

    return studentMap;
  }

  /**
   * List all real student interview sessions for faculty monitoring
   */
  public static async listSessions(query: {
    search?: string;
    status?: string;
    templateId?: string;
    date?: string;
  }) {
    const studentMap = await this.getStudentUsersMap();
    const studentIds = Array.from(studentMap.keys());

    // Query interviews belonging to registered students
    const interviews = await prisma.interview.findMany({
      where: {
        identityId: { in: studentIds },
      },
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch all templates for lookup
    const templates = await prisma.interviewTemplate.findMany({
      select: {
        id: true,
        name: true,
        interviewType: true,
        difficulty: true,
        defaultConfiguration: true,
      },
    });
    const templateMap = new Map<string, any>(templates.map((t) => [t.id, t]));

    const enrichedList: FacultyInterviewListItem[] = [];

    for (const iv of interviews) {
      const student = studentMap.get(iv.identityId);
      if (!student) continue;

      // Resolve template
      const tmpl = iv.templateId ? templateMap.get(iv.templateId) : null;
      const tmplCfg = (tmpl?.defaultConfiguration as any) || {};
      const templateInfo = {
        id: tmpl?.id || null,
        name: tmpl?.name || iv.title || 'Practice Assessment',
        interviewType: tmpl?.interviewType || iv.interviewType || 'MOCK',
        difficulty: tmpl?.difficulty || iv.difficulty || 'MIXED',
        selectionMode: tmplCfg.selectionMode || 'RANDOM',
      };

      // Fetch round assignments, execution records, and session history
      const [assignments, executions, history] = await Promise.all([
        (prisma as any).interviewRoundAssignment.findMany({
          where: { interviewId: iv.id },
        }).catch(() => []),
        (prisma as any).interviewExecutionRecord.findMany({
          where: { sessionId: iv.id },
        }).catch(() => []),
        (prisma as any).interviewHistory.findMany({
          where: { interviewId: iv.id },
        }).catch(() => []),
      ]);

      const aptAssignments = assignments.filter((a: any) => a.round === 'APTITUDE');
      const codAssignments = assignments.filter((a: any) => a.round === 'CODING');
      const hrAssignments = assignments.filter((a: any) => a.round === 'HR');

      const rep = iv.session?.reportSnapshot as any;
      const repSummary = rep?.summary;
      const scores = rep?.scores;

      // ── Stage 1: Aptitude Progress (Matches Student Assessment Report source of truth) ──
      const aptTotal = repSummary?.aptitudeTotal ?? (aptAssignments.length > 0 ? aptAssignments.length : 5);
      let aptCorrect = repSummary?.aptitudePassed;
      if (aptCorrect === undefined || aptCorrect === null) {
        const aptSubmitEvt = history.find((h: any) => h.event === 'APTITUDE_SUBMIT');
        if (aptSubmitEvt?.details && typeof aptSubmitEvt.details.correct === 'number') {
          aptCorrect = aptSubmitEvt.details.correct;
        } else if (scores?.aptitude !== undefined && scores?.aptitude !== null) {
          aptCorrect = Math.round((scores.aptitude / 100) * aptTotal);
        } else {
          aptCorrect = null;
        }
      }
      const aptScore = repSummary?.aptitudeScore ?? scores?.aptitude ?? (aptCorrect !== null && aptTotal > 0 ? Math.round((aptCorrect / aptTotal) * 100) : null);
      let aptStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
      if (rep?.assessmentCoverage?.aptitude === 'ASSESSED' || aptCorrect !== null || iv.state === 'COMPLETED') {
        aptStatus = 'COMPLETED';
      } else if (iv.state === 'RUNNING' || history.some((h: any) => h.event === 'APTITUDE_ANSWER_SAVE')) {
        aptStatus = 'IN_PROGRESS';
      }

      // ── Stage 2: Coding Progress (Matches Student Assessment Report source of truth) ──
      const codTotal = repSummary?.codingTotal ?? (codAssignments.length > 0 ? codAssignments.length : 2);
      let passedProblems = repSummary?.codingAccepted;
      if (passedProblems === undefined || passedProblems === null) {
        const passedRefIds = new Set(
          executions
            .filter((e: any) => e.status === 'PASSED' || (e.passedCount > 0 && e.passedCount === e.totalCount))
            .map((e: any) => e.questionRefId)
        );
        passedProblems = passedRefIds.size;
      }
      const attemptedProblems = rep?.coding?.attemptedProblems ?? (executions.length > 0 ? Math.max(1, passedProblems) : 0);
      const totalSubmissions = repSummary?.totalCodingAttempts ?? executions.length;
      const codScore = repSummary?.codingScore ?? scores?.coding ?? (codTotal > 0 ? Math.round((passedProblems / codTotal) * 100) : null);
      let codStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
      if (rep?.coding?.status === 'COMPLETED' || iv.state === 'COMPLETED' || (codTotal > 0 && passedProblems === codTotal)) {
        codStatus = 'COMPLETED';
      } else if (executions.length > 0 || iv.state === 'RUNNING') {
        codStatus = 'IN_PROGRESS';
      }

      // ── Stage 3: HR Progress ──
      const hrStatus = repSummary?.hrStatus ?? (rep?.assessmentCoverage?.hr === 'ASSESSED' || scores?.hr != null ? 'COMPLETED' : (history.some((h: any) => h.event === 'HR_MESSAGE') ? 'IN_PROGRESS' : 'NOT_STARTED'));
      const hrScore = scores?.hr !== undefined && scores?.hr !== null ? scores.hr : null;

      // ── Overall Status ──
      let overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EVALUATED' = 'NOT_STARTED';
      if (iv.state === 'COMPLETED') {
        overallStatus = (rep?.overallProficiencyScore != null || scores?.normalizedCompositeScore != null) ? 'EVALUATED' : 'COMPLETED';
      } else if (iv.state === 'RUNNING' || iv.state === 'PAUSED') {
        overallStatus = 'IN_PROGRESS';
      } else if (iv.state === 'CANCELLED' || iv.state === 'EXPIRED') {
        overallStatus = 'ABANDONED';
      }

      // ── Overall Score Display ──
      let overallScore = rep?.overallProficiencyScore ?? (scores?.normalizedCompositeScore != null ? Math.round(scores.normalizedCompositeScore) : null);
      let scoreDisplay = 'Not started';

      if (overallStatus === 'EVALUATED' && overallScore !== null) {
        scoreDisplay = `${overallScore}%`;
      } else if (overallStatus === 'COMPLETED') {
        scoreDisplay = 'Completed (Pending Evaluation)';
      } else if (overallStatus === 'IN_PROGRESS') {
        scoreDisplay = 'In progress';
      } else if (overallStatus === 'ABANDONED') {
        scoreDisplay = 'Abandoned';
      } else {
        scoreDisplay = 'Not enough assessment data';
      }

      enrichedList.push({
        id: iv.id,
        interviewId: iv.id,
        student: {
          identityId: student.identityId,
          profileId: student.profileId,
          fullName: student.fullName,
          email: student.email,
          department: student.department,
          college: student.college,
          batch: student.batch,
          rollNumber: student.rollNumber,
        },
        template: templateInfo,
        stages: {
          aptitude: {
            status: aptStatus,
            totalQuestions: aptTotal,
            attemptedCount: aptStatus === 'COMPLETED' ? aptTotal : (aptCorrect || 0),
            correctCount: aptCorrect,
            score: aptScore,
          },
          coding: {
            status: codStatus,
            totalProblems: codTotal,
            attemptedCount: attemptedProblems,
            passedProblems,
            totalSubmissions,
            score: codScore,
          },
          hr: {
            status: hrStatus,
            mode: 'Conversational AI',
            interactionsCount: hrAssignments.length || 1,
            evaluated: hrStatus === 'COMPLETED',
            score: hrScore,
          },
        },
        overallStatus,
        overallScore,
        scoreDisplay,
        startedAt: iv.session?.startedAt?.toISOString() || null,
        completedAt: iv.session?.finishedAt?.toISOString() || null,
        createdAt: iv.createdAt.toISOString(),
      });
    }

    // Apply query filters
    let filtered = enrichedList;

    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.student.fullName.toLowerCase().includes(q) ||
          item.student.email.toLowerCase().includes(q) ||
          (item.student.rollNumber && item.student.rollNumber.toLowerCase().includes(q)) ||
          item.template.name.toLowerCase().includes(q)
      );
    }

    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((item) => item.overallStatus === query.status);
    }

    if (query.templateId && query.templateId !== 'ALL') {
      if (query.templateId === 'PRACTICE') {
        filtered = filtered.filter((item) => !item.template.id);
      } else {
        filtered = filtered.filter((item) => item.template.id === query.templateId);
      }
    }

    return filtered;
  }

  /**
   * Group sessions strictly by unique student identity for hierarchical view
   */
  public static async listStudentSummaries(query: {
    search?: string;
    status?: string;
    templateId?: string;
    date?: string;
  }): Promise<FacultyStudentInterviewSummary[]> {
    const allSessions = await this.listSessions(query);

    const studentGroups = new Map<string, {
      student: any;
      sessions: FacultyInterviewListItem[];
    }>();

    for (const session of allSessions) {
      const studentKey = session.student.identityId;
      if (!studentGroups.has(studentKey)) {
        studentGroups.set(studentKey, {
          student: session.student,
          sessions: [],
        });
      }
      studentGroups.get(studentKey)!.sessions.push(session);
    }

    const summaries: FacultyStudentInterviewSummary[] = [];

    for (const [, group] of studentGroups) {
      const sessions = group.sessions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(
        (s) => s.overallStatus === 'COMPLETED' || s.overallStatus === 'EVALUATED'
      ).length;
      const inProgressSessions = sessions.filter((s) => s.overallStatus === 'IN_PROGRESS').length;
      const abandonedSessions = sessions.filter((s) => s.overallStatus === 'ABANDONED').length;

      // Calculate score only on real evaluated sessions with actual scores > 0
      const evaluatedScoredSessions = sessions.filter(
        (s) => s.overallStatus === 'EVALUATED' && s.overallScore !== null && s.overallScore !== undefined && s.overallScore > 0
      );
      let averageScore: number | null = null;
      let averageScoreDisplay = '—';

      if (evaluatedScoredSessions.length > 0) {
        const totalScore = evaluatedScoredSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0);
        averageScore = Math.round(totalScore / evaluatedScoredSessions.length);
        averageScoreDisplay = `${averageScore}%`;
      }

      summaries.push({
        student: group.student,
        totalSessions,
        completedSessions,
        inProgressSessions,
        abandonedSessions,
        averageScore,
        averageScoreDisplay,
        latestSessionAt: sessions[0]?.createdAt || null,
        sessions,
      });
    }

    return summaries.sort((a, b) => {
      const timeA = a.latestSessionAt ? new Date(a.latestSessionAt).getTime() : 0;
      const timeB = b.latestSessionAt ? new Date(b.latestSessionAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  /**
   * Get single interview session detailed breakdown for faculty view
   */
  public static async getSessionDetail(sessionId: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: sessionId },
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
        timelines: { orderBy: { changedAt: 'asc' } },
        events: { orderBy: { publishedAt: 'desc' }, take: 20 },
      },
    });

    if (!interview) {
      throw new Error('Interview session not found.');
    }

    const studentMap = await this.getStudentUsersMap();
    const student = studentMap.get(interview.identityId) || {
      identityId: interview.identityId,
      fullName: 'Candidate',
      email: 'student@nm.edu',
      department: 'Computer Science & Engineering',
      college: 'Naan Mudhalvan Partner College',
      batch: '2028',
      rollNumber: 'STU-' + interview.identityId.substring(0, 4).toUpperCase(),
    };

    let template: any = null;
    if (interview.templateId) {
      template = await prisma.interviewTemplate.findUnique({
        where: { id: interview.templateId },
      });
    }

    const tmplCfg = (template?.defaultConfiguration as any) || {};

    // Fetch assigned questions and submissions
    const [assignments, executions] = await Promise.all([
      (prisma as any).interviewRoundAssignment.findMany({
        where: { interviewId: interview.id },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      }).catch(() => []),
      (prisma as any).interviewExecutionRecord.findMany({
        where: { sessionId: interview.id },
        orderBy: { timestamp: 'desc' },
      }).catch(() => []),
    ]);

    // Hydrate assigned questions from Question Bank
    const hydrate = async (qId: string) => {
      try {
        const res = await axios.get(`${QUESTION_BANK_URL}/${qId}`, {
          headers: { 'x-user-role': 'FACULTY' },
        });
        return res.data?.data || null;
      } catch {
        return null;
      }
    };

    const hydratedAssignments = await Promise.all(
      assignments.map(async (a: any) => ({
        ...a,
        question: await hydrate(a.questionId),
      }))
    );

    const aptQuestions = hydratedAssignments.filter((a: any) => a.round === 'APTITUDE');
    const codQuestions = hydratedAssignments.filter((a: any) => a.round === 'CODING');
    const hrQuestions = hydratedAssignments.filter((a: any) => a.round === 'HR');

    const rep = interview.session?.reportSnapshot as any;
    const repSummary = rep?.summary;
    const scores = rep?.scores;

    // Derive Aptitude Correct Count
    const aptTotal = repSummary?.aptitudeTotal ?? (aptQuestions.length > 0 ? aptQuestions.length : 5);
    let aptCorrect = repSummary?.aptitudePassed;
    if (aptCorrect === undefined || aptCorrect === null) {
      if (scores?.aptitude !== undefined && scores?.aptitude !== null) {
        aptCorrect = Math.round((scores.aptitude / 100) * aptTotal);
      } else {
        aptCorrect = null;
      }
    }
    const aptScore = repSummary?.aptitudeScore ?? scores?.aptitude ?? (aptCorrect !== null && aptTotal > 0 ? Math.round((aptCorrect / aptTotal) * 100) : null);
    const aptStatus = rep?.assessmentCoverage?.aptitude === 'ASSESSED' || aptCorrect !== null || interview.state === 'COMPLETED' ? 'COMPLETED' : (interview.state === 'RUNNING' ? 'IN_PROGRESS' : 'NOT_STARTED');

    // Derive Coding Solved Count
    const codTotal = repSummary?.codingTotal ?? (codQuestions.length > 0 ? codQuestions.length : 2);
    let passedProblems = repSummary?.codingAccepted;
    if (passedProblems === undefined || passedProblems === null) {
      const passedRefIds = new Set(
        executions
          .filter((e: any) => e.status === 'PASSED' || (e.passedCount > 0 && e.passedCount === e.totalCount))
          .map((e: any) => e.questionRefId)
      );
      passedProblems = passedRefIds.size;
    }
    const attemptedProblems = rep?.coding?.attemptedProblems ?? (executions.length > 0 ? Math.max(1, passedProblems) : 0);
    const codScore = repSummary?.codingScore ?? scores?.coding ?? (codTotal > 0 ? Math.round((passedProblems / codTotal) * 100) : null);
    const codStatus = rep?.coding?.status === 'COMPLETED' || interview.state === 'COMPLETED' || (codTotal > 0 && passedProblems === codTotal) ? 'COMPLETED' : (executions.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');

    // Derive HR Status
    const hrStatus = repSummary?.hrStatus ?? (rep?.assessmentCoverage?.hr === 'ASSESSED' || scores?.hr != null ? 'COMPLETED' : (interview.state === 'RUNNING' ? 'IN_PROGRESS' : 'NOT_STARTED'));
    const hrScore = rep?.scores?.hr ?? scores?.hr ?? null;

    // Overall Score
    const overallScore = rep?.overallProficiencyScore ?? (scores?.normalizedCompositeScore != null ? Math.round(scores.normalizedCompositeScore) : null);

    return {
      id: interview.id,
      interviewId: interview.id,
      title: interview.title,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      state: interview.state,
      createdAt: interview.createdAt.toISOString(),
      startedAt: interview.session?.startedAt?.toISOString() || null,
      finishedAt: interview.session?.finishedAt?.toISOString() || null,
      student: {
        identityId: student.identityId,
        profileId: student.profileId,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone || '',
        college: student.college || 'Engineering Institute',
        department: student.department || 'Computer Science & Engineering',
        batch: student.batch || '2024-2028',
        rollNumber: student.rollNumber || 'STU-001',
      },
      template: {
        id: template?.id || null,
        name: template?.name || interview.title,
        interviewType: template?.interviewType || interview.interviewType,
        difficulty: template?.difficulty || interview.difficulty,
        duration: template?.duration || interview.configuration?.duration || 60,
        selectionMode: tmplCfg.selectionMode || 'RANDOM',
      },
      progress: {
        aptitude: {
          status: aptStatus,
          totalQuestions: aptTotal,
          correctCount: aptCorrect,
          score: aptScore,
          questions: aptQuestions.map((a: any, i: number) => ({
            order: i + 1,
            questionId: a.questionId,
            title: a.question?.title || `Aptitude Question #${i + 1}`,
            difficulty: a.question?.difficulty || 'MEDIUM',
            category: a.question?.category?.name || a.question?.category || 'Aptitude',
            topic: a.question?.topic?.name || a.question?.topic || 'Quantitative',
          })),
        },
        coding: {
          status: codStatus,
          totalProblems: codTotal,
          passedProblems,
          attemptedProblems,
          score: codScore,
          problems: codQuestions.map((c: any, i: number) => ({
            order: i + 1,
            questionId: c.questionId,
            title: c.question?.title || `Coding Problem #${i + 1}`,
            difficulty: c.question?.difficulty || 'MEDIUM',
            category: c.question?.category?.name || c.question?.category || 'Algorithms',
          })),
          submissions: executions.map((e: any) => {
            const rawCases = Array.isArray(e.testCaseResults) ? e.testCaseResults : [];
            const safeCases = rawCases.map((tc: any, idx: number) => {
              const isPassed = tc.passed === true || tc.status?.id === 3 || tc.status === 'Passed';
              return {
                id: tc.id || tc.testCaseId || `tc-${idx + 1}`,
                order: idx + 1,
                status: isPassed ? 'PASSED' : 'FAILED',
                passed: isPassed,
                hidden: false,
                input: tc.input !== undefined ? tc.input : (tc.stdin !== undefined ? tc.stdin : ''),
                expectedOutput: tc.expectedOutput !== undefined ? tc.expectedOutput : (tc.expected !== undefined ? tc.expected : ''),
                studentOutput: tc.actualOutput !== undefined ? tc.actualOutput : (tc.stdout !== undefined ? tc.stdout : (tc.studentOutput !== undefined ? tc.studentOutput : '')),
                executionTime: tc.time ? parseFloat(tc.time) : 0,
                memory: tc.memory || 0,
                errorMessage: tc.error || tc.errorMessage || null,
              };
            });

            return {
              id: e.id,
              questionRefId: e.questionRefId,
              questionTitle: e.questionTitle,
              language: e.language,
              runMode: e.runMode,
              status: e.status,
              statusDescription: e.statusDescription,
              primaryErrorType: e.primaryErrorType,
              passedCount: e.passedCount,
              totalCount: e.totalCount,
              score: e.score,
              executionTime: e.executionTime,
              memory: e.memory,
              compileOutput: e.compileOutput,
              stdout: e.stdout,
              stderr: e.stderr,
              sourceCode: e.sourceCode || null,
              testCaseResults: safeCases,
              attemptNumber: e.attemptNumber,
              timestamp: e.timestamp.toISOString(),
            };
          }),
        },
        hr: {
          status: hrStatus,
          mode: 'Conversational AI',
          prompt: tmplCfg.hrConfig?.initialPrompt || hrQuestions[0]?.question?.title || 'Conversational HR Dialogue',
          score: hrScore,
          interactionsCount: hrQuestions.length || 1,
        },
      },
      evaluation: {
        hasEvaluationData: overallScore !== null || rep?.finalized === true,
        overallScore,
        rawScore: scores?.rawCompositeScore,
        strengths: rep?.strengths || [],
        areasToImprove: rep?.areasToImprove || [],
        proficiency: rep?.coding?.proficiency || null,
        scoringExplanation: rep?.scoringExplanation || [],
        statusMessage:
          interview.state === 'RUNNING'
            ? 'Assessment in progress'
            : overallScore !== null || rep?.finalized === true
            ? 'Evaluation Complete'
            : 'Not enough data for final evaluation',
      },
      timelines: interview.timelines,
    };
  }

  /**
   * Get single code execution details for faculty review
   */
  public static async getExecutionDetail(executionId: string) {
    const execution = await (prisma as any).interviewExecutionRecord.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Execution record not found.');
    }

    const rawCases = Array.isArray(execution.testCaseResults) ? execution.testCaseResults : [];
    const safeCases = rawCases.map((tc: any, idx: number) => {
      const isPassed = tc.passed === true || tc.status?.id === 3 || tc.status === 'Passed';
      return {
        id: tc.id || tc.testCaseId || `tc-${idx + 1}`,
        order: idx + 1,
        status: isPassed ? 'PASSED' : 'FAILED',
        passed: isPassed,
        hidden: false,
        input: tc.input !== undefined ? tc.input : (tc.stdin !== undefined ? tc.stdin : ''),
        expectedOutput: tc.expectedOutput !== undefined ? tc.expectedOutput : (tc.expected !== undefined ? tc.expected : ''),
        studentOutput: tc.actualOutput !== undefined ? tc.actualOutput : (tc.stdout !== undefined ? tc.stdout : (tc.studentOutput !== undefined ? tc.studentOutput : '')),
        executionTime: tc.time ? parseFloat(tc.time) : 0,
        memory: tc.memory || 0,
        errorMessage: tc.error || tc.errorMessage || null,
      };
    });

    return {
      id: execution.id,
      sessionId: execution.sessionId,
      questionRefId: execution.questionRefId,
      questionTitle: execution.questionTitle,
      language: execution.language,
      runMode: execution.runMode,
      status: execution.status,
      statusDescription: execution.statusDescription,
      primaryErrorType: execution.primaryErrorType,
      passedCount: execution.passedCount,
      totalCount: execution.totalCount,
      score: execution.score,
      executionTime: execution.executionTime,
      memory: execution.memory,
      compileOutput: execution.compileOutput,
      stdout: execution.stdout,
      stderr: execution.stderr,
      sourceCode: execution.sourceCode || null,
      testCaseResults: safeCases,
      attemptNumber: execution.attemptNumber,
      timestamp: execution.timestamp.toISOString(),
    };
  }

  /**
   * Comprehensive Faculty Analytics Aggregation
   */
  public static async getFacultyAnalytics(query: {
    templateId?: string;
    department?: string;
    dateRange?: string; // '7d' | '30d' | '90d' | 'all'
    status?: string;
  }) {
    const studentMap = await this.getStudentUsersMap();
    let studentIds = Array.from(studentMap.keys());

    // Filter by department if requested
    if (query.department && query.department !== 'ALL') {
      const dept = query.department.toLowerCase();
      studentIds = studentIds.filter((id) => {
        const s = studentMap.get(id);
        return s?.department?.toLowerCase() === dept;
      });
    }

    // Determine date filter
    let dateSince: Date | null = null;
    const now = Date.now();
    if (query.dateRange === '7d') dateSince = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (query.dateRange === '30d') dateSince = new Date(now - 30 * 24 * 60 * 60 * 1000);
    else if (query.dateRange === '90d') dateSince = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Query all interviews belonging to these students
    const whereClause: any = {
      identityId: { in: studentIds },
    };
    if (query.templateId && query.templateId !== 'ALL') {
      whereClause.templateId = query.templateId;
    }
    if (query.status && query.status !== 'ALL') {
      whereClause.state = query.status;
    }
    if (dateSince) {
      whereClause.createdAt = { gte: dateSince };
    }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const interviewIds = interviews.map((i) => i.id);

    // Fetch executions and round assignments for these interviews
    const [executions, assignments] = await Promise.all([
      (prisma as any).interviewExecutionRecord.findMany({
        where: { sessionId: { in: interviewIds } },
        orderBy: { timestamp: 'desc' },
      }).catch(() => []),
      (prisma as any).interviewRoundAssignment.findMany({
        where: { interviewId: { in: interviewIds } },
      }).catch(() => []),
    ]);

    // Compute KPIs
    const completedInterviews = interviews.filter((i) => i.state === 'COMPLETED' || i.session?.reportSnapshot != null);
    const inProgressInterviews = interviews.filter((i) => i.state === 'RUNNING' || i.state === 'WAITING');

    const overallScores: number[] = [];
    const aptitudeScores: number[] = [];
    const codingScores: number[] = [];
    const hrScores: number[] = [];
    const dateTrendMap: Record<string, { sum: number; count: number }> = {};

    // Topic map for Aptitude
    const topicMap: Record<string, { attempted: number; correct: number }> = {};
    const difficultyMap: Record<string, { attempted: number; correct: number }> = {};
    let totalAptAttempted = 0;
    let totalAptCorrect = 0;

    // HR Metrics
    let totalHrResponses = 0;
    let hrSessionsAssessed = 0;

    // Per-Student Performance Map
    const studentPerformanceMap: Record<
      string,
      {
        assessmentsCount: number;
        completedCount: number;
        aptScores: number[];
        codScores: number[];
        hrScores: number[];
        overallScores: number[];
        lastActivityAt: string | null;
        failedExecutions: number;
      }
    > = {};

    for (const sId of studentIds) {
      studentPerformanceMap[sId] = {
        assessmentsCount: 0,
        completedCount: 0,
        aptScores: [],
        codScores: [],
        hrScores: [],
        overallScores: [],
        lastActivityAt: null,
        failedExecutions: 0,
      };
    }

    for (const iv of interviews) {
      const sPerf = studentPerformanceMap[iv.identityId];
      if (sPerf) {
        sPerf.assessmentsCount++;
        const actTime = iv.session?.lastActiveAt || iv.updatedAt;
        if (!sPerf.lastActivityAt || new Date(actTime) > new Date(sPerf.lastActivityAt)) {
          sPerf.lastActivityAt = actTime.toISOString();
        }
      }

      const rep = iv.session?.reportSnapshot as any;
      if (rep) {
        const ovScore = rep.overallScore ?? rep.metrics?.overallProficiencyScore ?? rep.overallProficiencyScore;
        if (typeof ovScore === 'number' && !isNaN(ovScore)) {
          overallScores.push(ovScore);
          if (sPerf) {
            sPerf.completedCount++;
            sPerf.overallScores.push(ovScore);
          }

          // Trend grouping
          const dateStr = new Date(iv.session?.finishedAt || iv.createdAt).toISOString().split('T')[0];
          if (!dateTrendMap[dateStr]) dateTrendMap[dateStr] = { sum: 0, count: 0 };
          dateTrendMap[dateStr].sum += ovScore;
          dateTrendMap[dateStr].count++;
        }

        // Aptitude analysis extraction
        const aptScore = rep.scores?.aptitude ?? rep.summary?.aptitudeScore;
        if (typeof aptScore === 'number') {
          aptitudeScores.push(aptScore);
          if (sPerf) sPerf.aptScores.push(aptScore);
        }

        const aptList = rep.aptitudeAnalysis || rep.stages?.aptitude?.questions || [];
        for (const q of aptList) {
          const top = q.topic || q.category || 'Quantitative';
          const diff = q.difficulty || 'MEDIUM';
          const isCorrect = q.isCorrect === true || q.passed === true || q.status === 'CORRECT';

          totalAptAttempted++;
          if (isCorrect) totalAptCorrect++;

          if (!topicMap[top]) topicMap[top] = { attempted: 0, correct: 0 };
          topicMap[top].attempted++;
          if (isCorrect) topicMap[top].correct++;

          if (!difficultyMap[diff]) difficultyMap[diff] = { attempted: 0, correct: 0 };
          difficultyMap[diff].attempted++;
          if (isCorrect) difficultyMap[diff].correct++;
        }

        // Coding scores
        const codScore = rep.scores?.coding ?? rep.summary?.codingScore;
        if (typeof codScore === 'number') {
          codingScores.push(codScore);
          if (sPerf) sPerf.codScores.push(codScore);
        }

        // HR scores
        const hrScore = rep.scores?.hr ?? rep.summary?.hrScore;
        if (typeof hrScore === 'number') {
          hrScores.push(hrScore);
          if (sPerf) sPerf.hrScores.push(hrScore);
        }

        if (rep.stages?.hr?.candidateResponsesCount) {
          totalHrResponses += rep.stages.hr.candidateResponsesCount;
          hrSessionsAssessed++;
        } else if (rep.assessmentCoverage?.hr === 'ASSESSED') {
          hrSessionsAssessed++;
        }
      }
    }

    // Coding execution analysis (separate RUN and SUBMIT)
    const runExecutions = executions.filter((e: any) => e.runMode === 'RUN');
    const submitExecutions = executions.filter((e: any) => e.runMode === 'SUBMIT');

    let totalTestsPassed = 0;
    let totalTestsCount = 0;

    const verdictDistribution = {
      accepted: 0,
      wrongAnswer: 0,
      compilationError: 0,
      runtimeError: 0,
      timeLimitExceeded: 0,
    };

    for (const e of executions) {
      if (e.runMode === 'SUBMIT') {
        totalTestsPassed += e.passedCount || 0;
        totalTestsCount += e.totalCount || 0;

        const isPassed = e.status === 'PASSED' || (e.passedCount > 0 && e.passedCount === e.totalCount);
        if (isPassed) {
          verdictDistribution.accepted++;
        } else if (e.status === 'COMPILATION_ERROR' || e.primaryErrorType === 'COMPILATION_ERROR' || (e.compileOutput && e.compileOutput.trim().length > 0)) {
          verdictDistribution.compilationError++;
        } else if (e.status === 'TIME_LIMIT_EXCEEDED' || e.primaryErrorType === 'TIME_LIMIT_EXCEEDED') {
          verdictDistribution.timeLimitExceeded++;
        } else if (e.status === 'RUNTIME_ERROR' || e.primaryErrorType === 'RUNTIME_ERROR' || e.stderr) {
          verdictDistribution.runtimeError++;
        } else {
          verdictDistribution.wrongAnswer++;
        }
      }

      // Track failures per student
      const sess = interviews.find((i) => i.id === e.sessionId);
      if (sess && (e.status !== 'PASSED' && e.passedCount !== e.totalCount)) {
        if (studentPerformanceMap[sess.identityId]) {
          studentPerformanceMap[sess.identityId].failedExecutions++;
        }
      }
    }

    // Performance Trend Array
    const performanceTrend = Object.keys(dateTrendMap)
      .sort()
      .map((date) => ({
        date,
        averageScore: Math.round((dateTrendMap[date].sum / dateTrendMap[date].count) * 10) / 10,
        count: dateTrendMap[date].count,
      }));

    // Aptitude Topic Breakdown Array
    const topicBreakdown = Object.keys(topicMap).map((topic) => {
      const t = topicMap[topic];
      const accuracy = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0;
      return {
        topic,
        attempted: t.attempted,
        correct: t.correct,
        accuracy,
      };
    }).sort((a, b) => b.attempted - a.attempted);

    // Aptitude Difficulty Breakdown Array
    const difficultyBreakdown = Object.keys(difficultyMap).map((difficulty) => {
      const d = difficultyMap[difficulty];
      const accuracy = d.attempted > 0 ? Math.round((d.correct / d.attempted) * 1000) / 10 : 0;
      return {
        difficulty,
        attempted: d.attempted,
        correct: d.correct,
        accuracy,
      };
    });

    // Overview KPIs & Rates
    const avgOverall = overallScores.length > 0 ? Math.round((overallScores.reduce((a, b) => a + b, 0) / overallScores.length) * 10) / 10 : null;
    const avgAptitude = aptitudeScores.length > 0 ? Math.round((aptitudeScores.reduce((a, b) => a + b, 0) / aptitudeScores.length) * 10) / 10 : null;
    const avgCoding = codingScores.length > 0 ? Math.round((codingScores.reduce((a, b) => a + b, 0) / codingScores.length) * 10) / 10 : null;
    const avgHr = hrScores.length > 0 ? Math.round((hrScores.reduce((a, b) => a + b, 0) / hrScores.length) * 10) / 10 : null;

    const aptAccuracyRate = totalAptAttempted > 0 ? Math.round((totalAptCorrect / totalAptAttempted) * 1000) / 10 : null;
    const codingAcceptanceRate = submitExecutions.length > 0 ? Math.round((verdictDistribution.accepted / submitExecutions.length) * 1000) / 10 : null;
    const codingTestPassRate = totalTestsCount > 0 ? Math.round((totalTestsPassed / totalTestsCount) * 1000) / 10 : null;
    const hrCompletionRate = completedInterviews.length > 0 ? Math.round((hrSessionsAssessed / completedInterviews.length) * 1000) / 10 : null;

    const verdictPercentages = {
      accepted: submitExecutions.length > 0 ? Math.round((verdictDistribution.accepted / submitExecutions.length) * 1000) / 10 : 0,
      wrongAnswer: submitExecutions.length > 0 ? Math.round((verdictDistribution.wrongAnswer / submitExecutions.length) * 1000) / 10 : 0,
      compilationError: submitExecutions.length > 0 ? Math.round((verdictDistribution.compilationError / submitExecutions.length) * 1000) / 10 : 0,
      runtimeError: submitExecutions.length > 0 ? Math.round((verdictDistribution.runtimeError / submitExecutions.length) * 1000) / 10 : 0,
      timeLimitExceeded: submitExecutions.length > 0 ? Math.round((verdictDistribution.timeLimitExceeded / submitExecutions.length) * 1000) / 10 : 0,
    };

    // Student Roster
    const studentRoster = studentIds.map((id) => {
      const student = studentMap.get(id);
      const perf = studentPerformanceMap[id];

      const sAvgOverall = perf.overallScores.length > 0 ? Math.round((perf.overallScores.reduce((a, b) => a + b, 0) / perf.overallScores.length) * 10) / 10 : null;
      const sAvgApt = perf.aptScores.length > 0 ? Math.round((perf.aptScores.reduce((a, b) => a + b, 0) / perf.aptScores.length) * 10) / 10 : null;
      const sAvgCod = perf.codScores.length > 0 ? Math.round((perf.codScores.reduce((a, b) => a + b, 0) / perf.codScores.length) * 10) / 10 : null;
      const sAvgHr = perf.hrScores.length > 0 ? Math.round((perf.hrScores.reduce((a, b) => a + b, 0) / perf.hrScores.length) * 10) / 10 : null;

      let status: 'ACTIVE' | 'INACTIVE' | 'NEEDS_ATTENTION' = 'INACTIVE';
      if ((sAvgOverall !== null && sAvgOverall < 50) || perf.failedExecutions >= 3) {
        status = 'NEEDS_ATTENTION';
      } else if (perf.assessmentsCount > 0) {
        status = 'ACTIVE';
      }

      return {
        studentId: student.profileId || student.identityId,
        identityId: student.identityId,
        name: student.fullName,
        email: student.email,
        department: student.department,
        college: student.college,
        batch: student.batch,
        rollNumber: student.rollNumber,
        assessmentsCount: perf.assessmentsCount,
        completedCount: perf.completedCount,
        scores: {
          aptitude: sAvgApt,
          coding: sAvgCod,
          hr: sAvgHr,
          overall: sAvgOverall,
        },
        status,
        lastActivityAt: perf.lastActivityAt,
      };
    });

    // Students Needing Attention
    const studentsNeedingAttention = studentRoster
      .filter((s) => s.status === 'NEEDS_ATTENTION')
      .map((s) => {
        const perf = studentPerformanceMap[s.identityId];
        const isFailing = s.scores.overall !== null && s.scores.overall < 50;
        return {
          id: s.studentId,
          identityId: s.identityId,
          name: s.name,
          department: s.department,
          batch: s.batch,
          performanceScore: isFailing ? `${s.scores.overall}%` : `${perf.failedExecutions} failures`,
          reason: isFailing
            ? `Average score (${s.scores.overall}%) below 50% benchmark`
            : `${perf.failedExecutions} failed official submissions`,
          severity: isFailing ? 'HIGH' : 'MEDIUM',
          lastActive: s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : 'Recently',
        };
      });

    // Distinct filters metadata
    const templates = await prisma.interviewTemplate.findMany({
      select: { id: true, name: true, interviewType: true },
    });
    const departments = Array.from(new Set(studentIds.map((id) => studentMap.get(id)?.department).filter(Boolean))).sort();

    return {
      overview: {
        totalStudents: studentIds.length,
        completedAssessments: completedInterviews.length,
        inProgressAssessments: inProgressInterviews.length,
        totalAssessments: interviews.length,
        averageOverallScore: avgOverall,
        overallScoresDenominator: overallScores.length,
        aptitudeAccuracy: aptAccuracyRate,
        aptitudeCorrectCount: totalAptCorrect,
        aptitudeAttemptedCount: totalAptAttempted,
        codingAcceptanceRate,
        codingAcceptedCount: verdictDistribution.accepted,
        codingSubmissionCount: submitExecutions.length,
        codingTestPassRate,
        hrCompletionRate,
        hrCandidateResponsesCount: totalHrResponses,
        averageAptitudeScore: avgAptitude,
        averageCodingScore: avgCoding,
        averageHrScore: avgHr,
        totalSubmissions: submitExecutions.length,
        totalRuns: runExecutions.length,
        totalExecutions: executions.length,
        hasEnoughData: overallScores.length > 0,
      },
      performanceTrend,
      aptitudeAnalytics: {
        averageScore: avgAptitude,
        accuracyPercentage: aptAccuracyRate,
        attemptedCount: totalAptAttempted,
        correctCount: totalAptCorrect,
        incorrectCount: Math.max(0, totalAptAttempted - totalAptCorrect),
        topicBreakdown,
        difficultyBreakdown,
        hasData: totalAptAttempted > 0,
      },
      codingAnalytics: {
        problemsAssigned: assignments.filter((a: any) => a.round === 'CODING').length || 2,
        problemsSubmitted: submitExecutions.length,
        problemsAccepted: verdictDistribution.accepted,
        submissionAcceptanceRate: codingAcceptanceRate,
        verdictDistribution,
        verdictPercentages,
        runAttemptsCount: runExecutions.length,
        submitAttemptsCount: submitExecutions.length,
        totalExecutions: executions.length,
        testsPassedCount: totalTestsPassed,
        totalTestsCount,
        testPassRate: codingTestPassRate,
        hasData: executions.length > 0,
      },
      hrAnalytics: {
        completedSessionsCount: hrSessionsAssessed,
        totalCompletedAssessments: completedInterviews.length,
        completionRate: hrCompletionRate,
        totalResponsesCount: totalHrResponses,
        averageScore: avgHr,
        hasData: hrSessionsAssessed > 0,
      },
      studentRoster,
      studentsNeedingAttention,
      filterOptions: {
        templates: templates.map((t) => ({ id: t.id, name: t.name, type: t.interviewType })),
        departments,
      },
      metadata: {
        dataStatus: 'VERIFIED',
        scope: 'AUTHORIZED_COHORT',
        evaluatedReportsCount: overallScores.length,
      },
    };
  }

  /**
   * Get List of Completed Reports for Faculty Review
   */
  public static async getFacultyReports(query: {
    search?: string;
    templateId?: string;
    interviewType?: string;
    date?: string;
    scoreMin?: number;
    scoreMax?: number;
  }) {
    const studentMap = await this.getStudentUsersMap();
    const studentIds = Array.from(studentMap.keys());

    const whereClause: any = {
      identityId: { in: studentIds },
    };

    if (query.templateId && query.templateId !== 'ALL') {
      whereClause.templateId = query.templateId;
    }
    if (query.interviewType && query.interviewType !== 'ALL') {
      whereClause.interviewType = query.interviewType;
    }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const templates = await prisma.interviewTemplate.findMany({
      select: { id: true, name: true, interviewType: true, difficulty: true },
    });
    const templateMap = new Map<string, any>(templates.map((t) => [t.id, t]));

    const reportList: any[] = [];

    for (const iv of interviews) {
      const student = studentMap.get(iv.identityId);
      if (!student) continue;

      const tmpl = iv.templateId ? templateMap.get(iv.templateId) : null;
      const rep = iv.session?.reportSnapshot as any;

      // Extract scores from snapshot or summary
      const aptScore = rep?.scores?.aptitude ?? rep?.summary?.aptitudeScore ?? null;
      const codScore = rep?.scores?.coding ?? rep?.summary?.codingScore ?? null;
      const hrScore = rep?.scores?.hr ?? rep?.summary?.hrScore ?? null;
      const overallScore = rep?.overallScore ?? rep?.metrics?.overallProficiencyScore ?? rep?.overallProficiencyScore ?? null;

      // Only include assessments that have finished or have reports
      const isCompleted = iv.state === 'COMPLETED' || iv.session?.finalizedAt != null || rep != null;
      if (!isCompleted) continue;

      const item = {
        id: iv.id,
        interviewId: iv.id,
        sessionId: iv.session?.id || iv.id,
        title: iv.title || tmpl?.name || 'Practice Assessment',
        templateName: tmpl?.name || 'Standard Mock Interview',
        interviewType: tmpl?.interviewType || iv.interviewType || 'MOCK',
        difficulty: tmpl?.difficulty || iv.difficulty || 'MIXED',
        student: {
          id: student.profileId || student.identityId,
          identityId: student.identityId,
          fullName: student.fullName,
          email: student.email,
          department: student.department,
          batch: student.batch,
          college: student.college,
          rollNumber: student.rollNumber,
        },
        completedAt: iv.session?.finishedAt || iv.updatedAt,
        startedAt: iv.session?.startedAt || iv.createdAt,
        duration: iv.configuration?.duration || 60,
        scores: {
          aptitude: aptScore,
          coding: codScore,
          hr: hrScore,
          overall: overallScore,
        },
        status: iv.state,
        hasReport: !!rep,
        monitoring: rep?.monitoring ? {
          status: rep.monitoring.status || rep.monitoring.monitoringStatus || 'Integrity Verified',
          monitoringStatus: rep.monitoring.status || rep.monitoring.monitoringStatus || 'Integrity Verified',
          totalSwitches: rep.monitoring.totalSwitches ?? rep.monitoring.tabSwitches ?? (rep.monitoring.events ? rep.monitoring.events.length : 0),
          tabSwitches: rep.monitoring.totalSwitches ?? rep.monitoring.tabSwitches ?? (rep.monitoring.events ? rep.monitoring.events.length : 0),
          totalAwaySeconds: rep.monitoring.totalAwaySeconds ?? rep.monitoring.totalTimeAwaySeconds ?? (rep.monitoring.events ? rep.monitoring.events.reduce((s: number, e: any) => s + (e.durationSeconds || 0), 0) : 0),
          totalTimeAwaySeconds: rep.monitoring.totalAwaySeconds ?? rep.monitoring.totalTimeAwaySeconds ?? (rep.monitoring.events ? rep.monitoring.events.reduce((s: number, e: any) => s + (e.durationSeconds || 0), 0) : 0),
          events: rep.monitoring.events || [],
        } : {
          status: 'Integrity Verified',
          monitoringStatus: 'Integrity Verified',
          totalSwitches: 0,
          tabSwitches: 0,
          totalAwaySeconds: 0,
          totalTimeAwaySeconds: 0,
          events: [],
        },
        completionReason:
          rep?.completionDetails?.reason ||
          (iv.session?.completionReason === 'TIME_EXPIRED'
            ? 'Automatically Submitted — Time Expired'
            : 'Manually Submitted'),
      };

      reportList.push(item);
    }

    // Search and filter in memory
    let filtered = reportList;
    if (query.search) {
      const q = query.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.student.fullName.toLowerCase().includes(q) ||
          r.student.email.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.templateName.toLowerCase().includes(q)
      );
    }

    if (query.scoreMin !== undefined && !isNaN(query.scoreMin)) {
      filtered = filtered.filter((r) => r.scores.overall !== null && r.scores.overall >= query.scoreMin!);
    }
    if (query.scoreMax !== undefined && !isNaN(query.scoreMax)) {
      filtered = filtered.filter((r) => r.scores.overall !== null && r.scores.overall <= query.scoreMax!);
    }

    return {
      reports: filtered,
      totalCount: filtered.length,
      unfilteredCount: reportList.length,
    };
  }

  /**
   * Get Final Assessment Report for a Student's Session (Faculty View)
   */
  public static async getFacultyReportDetail(sessionId: string) {
    const interview = await prisma.interview.findFirst({
      where: {
        OR: [{ id: sessionId }, { session: { id: sessionId } }],
      },
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
      },
    });

    if (!interview) {
      throw new Error('Interview session not found.');
    }

    const studentMap = await this.getStudentUsersMap();
    const student = studentMap.get(interview.identityId) || {
      identityId: interview.identityId,
      fullName: 'Student',
      email: 'student@nm.edu',
      department: 'Computer Science & Engineering',
      college: 'Naan Mudhalvan Partner College',
      batch: '2028',
      rollNumber: 'STU-' + interview.identityId.substring(0, 4).toUpperCase(),
    };

    // If reportSnapshot exists in session, return sanitized snapshot
    let report = interview.session?.reportSnapshot as any;
    if (!report) {
      // Generate report using ReportService
      try {
        const { ReportService } = require('./ReportService');
        report = await ReportService.getReport(interview.id, interview.identityId);
      } catch (err: any) {
        console.warn('Could not generate report dynamically:', err.message);
      }
    }

    return {
      interviewId: interview.id,
      sessionId: interview.session?.id || interview.id,
      title: interview.title,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      state: interview.state,
      student,
      report,
      completedAt: interview.session?.finishedAt || interview.updatedAt,
      finalizedAt: interview.session?.finalizedAt,
    };
  }
}

