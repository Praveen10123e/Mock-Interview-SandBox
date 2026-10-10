import { PrismaClient } from '../generated/client';
import { ReportEvidenceService, CompleteSessionEvidence } from './ReportEvidenceService';
import { ReportAnalysisService, SynthesizedReport, DetailedAptitudeAnalysis, DetailedCodingAnalysis } from './ReportAnalysisService';
import { InterviewAutopsyService } from './InterviewAutopsyService';
import axios from 'axios';
import crypto from 'crypto';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowups?: string[];
  practiceQuestion?: {
    practiceQuestionId: string;
    question: string;
    options: string[];
    optionLabels: string[];
    relatedQuestionId?: string;
  };
}

export interface ChatRouteResponse {
  answer: string;
  suggestedFollowups: string[];
  relatedQuestionId?: string;
  mode?: string;
  practiceQuestion?: any;
  contextQuestionIndex?: number;
  contextAttemptNumber?: number;
}

export class ReportChatService {
  /**
   * Process interactive chat query grounded strictly in student's interview evidence
   */
  static async handleChatQuery(
    interviewId: string,
    identityId: string,
    userMessage: string,
    displayContent?: string,
    userRole?: string
  ): Promise<ChatMessage> {
    if (!userMessage || !userMessage.trim()) {
      throw new Error('Message content cannot be empty.');
    }

    // 1. Collect exact session evidence and synthesis (also verifies ownership)
    const evidence = await ReportEvidenceService.collectEvidence(interviewId, identityId, undefined, userRole);
    const synthesis = await ReportAnalysisService.synthesizeReport(evidence);

    // 2. Fetch previous chat interaction context for multi-turn coherence
    const recentChat = await prisma.interviewHistory.findFirst({
      where: { interviewId, event: 'REPORT_CHAT_MESSAGE' },
      orderBy: { timestamp: 'desc' },
    });
    const prevDetails = (recentChat?.details as any) || {};
    const previousContext = {
      questionIndex: typeof prevDetails.contextQuestionIndex === 'number' ? prevDetails.contextQuestionIndex : undefined,
      attemptNumber: typeof prevDetails.contextAttemptNumber === 'number' ? prevDetails.contextAttemptNumber : undefined,
    };

    // 3. Route request to appropriate handler
    const response = await this.routeRequest(userMessage.trim(), evidence, synthesis, interviewId, identityId, previousContext);

    // Build human-readable display content for the user message
    const humanReadableQuery = displayContent || this.toDisplayContent(userMessage);

    const messageRecord: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: response.answer,
      timestamp: new Date().toISOString(),
      suggestedFollowups: response.suggestedFollowups,
      practiceQuestion: response.practiceQuestion,
    };

    // 4. Persist chat interaction in InterviewHistory with conversational context
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'REPORT_CHAT_MESSAGE',
        details: {
          userQuery: humanReadableQuery,
          aiResponse: response.answer,
          suggestedFollowups: response.suggestedFollowups || [],
          relatedQuestionId: response.relatedQuestionId || null,
          mode: response.mode || null,
          practiceQuestion: response.practiceQuestion || null,
          contextQuestionIndex: response.contextQuestionIndex !== undefined ? response.contextQuestionIndex : null,
          contextAttemptNumber: response.contextAttemptNumber !== undefined ? response.contextAttemptNumber : null,
          timestamp: new Date().toISOString(),
        } as any,
      },
    });

    return messageRecord;
  }

  /**
   * Convert raw message payload to a human-readable display string.
   * Structured JSON payloads from the frontend are converted to friendly labels.
   */
  private static toDisplayContent(userMessage: string): string {
    try {
      if (userMessage.startsWith('{') && userMessage.endsWith('}')) {
        const parsed = JSON.parse(userMessage);
        if (parsed.type === 'QUESTION_CONTEXT') {
          return `💬 Asking AI about Q${parsed.questionNumber}: ${parsed.question}`;
        }
        if (parsed.type === 'CODING_CONTEXT') {
          return `💻 Discussing Coding Problem #${parsed.problemNumber || 1}: ${parsed.title}`;
        }
        if (parsed.type === 'CODING_MODE') {
          const codingModeLabels: Record<string, string> = {
            WHAT_IS_WRONG: `🧐 What exactly is wrong in my code for Problem #${parsed.problemNumber || 1}?`,
            WHICH_TEST_FAILED: `❌ Which test case failed for Problem #${parsed.problemNumber || 1}?`,
            COMPLEXITY: `⚡ Why is my solution ${parsed.candidateComplexity || 'suboptimal'} for Problem #${parsed.problemNumber || 1}?`,
            CORRECT_APPROACH: `💡 Show me the optimal approach for Problem #${parsed.problemNumber || 1}`,
            TEACH_PATTERN: `🎓 Teach me the algorithmic pattern for Problem #${parsed.problemNumber || 1}`,
          };
          return codingModeLabels[parsed.mode] || `Coding Query: ${parsed.mode} for Problem #${parsed.problemNumber || 1}`;
        }
        if (parsed.type === 'TEACHING_MODE') {
          const modeLabels: Record<string, string> = {
            HINT: `💡 Give me a hint for Q${parsed.questionNumber}`,
            EXPLAIN: `📖 Explain the answer for Q${parsed.questionNumber}`,
            TEACH_ME: `🎓 Teach me from basics for Q${parsed.questionNumber}`,
            EXPLAIN_MISTAKE: `🧐 Explain my mistake in Q${parsed.questionNumber}`,
            SIMILAR_QUESTION: `🧠 Give me a similar practice question for Q${parsed.questionNumber}`,
          };
          return modeLabels[parsed.mode] || `Mode: ${parsed.mode} for Q${parsed.questionNumber}`;
        }
      }
    } catch {
      // Not a structured payload — use as-is
    }
    return userMessage;
  }

  /**
   * Validate answer submitted for a specific practice question
   */
  static async validatePracticeAnswer(
    interviewId: string,
    identityId: string,
    practiceQuestionId: string,
    studentAnswerLetter: string
  ): Promise<ChatMessage> {
    // 1. Validate ownership
    await ReportEvidenceService.collectEvidence(interviewId, identityId);

    // 2. Find practice question in InterviewHistory
    const records = await prisma.interviewHistory.findMany({
      where: {
        interviewId,
        event: 'REPORT_PRACTICE_QUESTION',
      },
      orderBy: { timestamp: 'desc' },
    });

    const targetRecord = records.find(r => (r.details as any)?.practiceQuestionId === practiceQuestionId);
    if (!targetRecord || !targetRecord.details) {
      throw new Error('Practice question not found or expired. Please generate a new similar question.');
    }

    const pq = targetRecord.details as any;
    const correctIdx = typeof pq.correctOptionIndex === 'number' ? pq.correctOptionIndex : 0;
    const options: string[] = pq.options || [];
    const optionLabels: string[] = pq.optionLabels || options.map((_, i) => String.fromCharCode(65 + i));

    // Normalize student answer (e.g. 'A' -> 0)
    const letter = studentAnswerLetter.trim().toUpperCase().charAt(0);
    const selectedIdx = optionLabels.indexOf(letter) !== -1 ? optionLabels.indexOf(letter) : (letter.charCodeAt(0) - 65);
    const isCorrect = selectedIdx === correctIdx;

    const correctLabel = optionLabels[correctIdx] || String.fromCharCode(65 + correctIdx);
    const selectedLabel = optionLabels[selectedIdx] || letter;
    const correctText = options[correctIdx] || '';
    const selectedText = options[selectedIdx] || '';

    let feedback = '';
    if (isCorrect) {
      feedback = `🎉 **Correct! Option ${selectedLabel} (${selectedText}) is the right answer.**\n\n` +
        `**Solution Explanation**:\n${pq.explanation || 'You correctly applied the mathematical principle to solve this question.'}\n\n` +
        `Great job mastering this concept! Would you like another similar question or to explore a different topic?`;
    } else {
      feedback = `❌ **Not quite. You selected Option ${selectedLabel} (${selectedText}).**\n\n` +
        `* **Correct Answer**: **Option ${correctLabel} — ${correctText}**\n\n` +
        `**Step-by-Step Resolution**:\n${pq.explanation || `The problem parameters solve to Option ${correctLabel}.`}\n\n` +
        `Would you like to try another similar question or have me explain the concept from basics?`;
    }

    // Persist answer validation
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'REPORT_PRACTICE_ANSWER',
        details: {
          practiceQuestionId,
          studentAnswer: studentAnswerLetter,
          isCorrect,
          feedback,
          timestamp: new Date().toISOString(),
        } as any,
      },
    });

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: feedback,
      timestamp: new Date().toISOString(),
      suggestedFollowups: ['Give me another similar question', 'Teach me from basics', 'Was my coding approach optimal?'],
    };
  }

  /**
   * Retrieve chat history for this interview session
   */
  static async getChatHistory(interviewId: string, identityId: string, userRole?: string): Promise<ChatMessage[]> {
    // Validate ownership
    await ReportEvidenceService.collectEvidence(interviewId, identityId, undefined, userRole);

    const records = await prisma.interviewHistory.findMany({
      where: {
        interviewId,
        event: { in: ['REPORT_CHAT_MESSAGE', 'REPORT_PRACTICE_ANSWER'] },
      },
      orderBy: { timestamp: 'asc' },
    });

    const messages: ChatMessage[] = [];
    records.forEach((r, idx) => {
      const d = r.details as any;
      if (d) {
        if (d.userQuery) {
          messages.push({
            id: `usr-${idx}-${r.id}`,
            role: 'user',
            // userQuery is already the human-readable display string (stored by handleChatQuery)
            content: d.userQuery,
            timestamp: r.timestamp.toISOString(),
          });
        }
        if (d.aiResponse) {
          messages.push({
            id: `ai-${idx}-${r.id}`,
            role: 'assistant',
            content: d.aiResponse,
            timestamp: r.timestamp.toISOString(),
            // Restore persisted follow-ups and practice question for correct chip rendering
            suggestedFollowups: Array.isArray(d.suggestedFollowups) ? d.suggestedFollowups : undefined,
            practiceQuestion: d.practiceQuestion || undefined,
          });
        }
        if (d.feedback) {
          messages.push({
            id: `ai-ans-${idx}-${r.id}`,
            role: 'assistant',
            content: d.feedback,
            timestamp: r.timestamp.toISOString(),
            suggestedFollowups: Array.isArray(d.suggestedFollowups) ? d.suggestedFollowups : undefined,
          });
        }
      }
    });

    return messages;
  }

  /**
   * Master request router
   */
  private static async routeRequest(
    userMessage: string,
    evidence: any,
    synthesis: SynthesizedReport,
    interviewId: string,
    identityId: string,
    previousContext?: { questionIndex?: number; attemptNumber?: number }
  ): Promise<ChatRouteResponse> {
    // 1. Check for JSON structured payload from frontend (Ask AI button / Teaching pills)
    try {
      if (userMessage.startsWith('{') && userMessage.endsWith('}')) {
        const payload = JSON.parse(userMessage);

        if (payload.type === 'QUESTION_CONTEXT') {
          return this.handleQuestionContext(payload, synthesis);
        }

        if (payload.type === 'TEACHING_MODE') {
          return this.handleTeachingMode(payload, synthesis, interviewId, identityId);
        }

        if (payload.type === 'CODING_CONTEXT' || payload.type === 'CODING_MODE') {
          return this.handleCodingChat(userMessage, synthesis, evidence, interviewId, identityId, payload, previousContext);
        }
      }
    } catch {
      // Fall through to text matching
    }

    const qLower = userMessage.toLowerCase();

    // 2. Check for Practice Question Answer submission in chat text (e.g., "My answer is A", "Answer: B", "A")
    const ansMatch = userMessage.match(/\b(?:my\s+answer\s+is|answer\s*[:=]?)\s*([A-D])\b/i) || userMessage.match(/^([A-D])$/i);
    if (ansMatch) {
      const letter = ansMatch[1].toUpperCase();
      // Look for latest practice question
      const latestPQ = await prisma.interviewHistory.findFirst({
        where: { interviewId, event: 'REPORT_PRACTICE_QUESTION' },
        orderBy: { timestamp: 'desc' }
      });
      if (latestPQ && latestPQ.details) {
        const pqId = (latestPQ.details as any).practiceQuestionId;
        const valRes = await this.validatePracticeAnswer(interviewId, identityId, pqId, letter);
        return {
          answer: valRes.content,
          suggestedFollowups: valRes.suggestedFollowups || [],
        };
      }
    }

    // 2.5 Check for Interview Autopsy & Recurring Weaknesses Queries (Phase 5)
    const isAutopsyQuery =
      qLower.includes('autopsy') ||
      qLower.includes('recurring') ||
      qLower.includes('repeatedly') ||
      qLower.includes('keep failing') ||
      qLower.includes('why do i keep') ||
      qLower.includes('cross interview') ||
      qLower.includes('historical weakness') ||
      qLower.includes('failure pattern');

    if (isAutopsyQuery) {
      return this.handleAutopsyChat(userMessage, identityId);
    }

    // 3. Check for HR / BEHAVIORAL / SUMMARY queries (Phase 4 Evidence Integration)
    const isHrQuery =
      qLower.includes('hr') ||
      qLower.includes('behavioral') ||
      qLower.includes('communication') ||
      qLower.includes('filler') ||
      qLower.includes('speech') ||
      qLower.includes('star') ||
      qLower.includes('weakness') ||
      qLower.includes('biggest weakness') ||
      qLower.includes('strongest skill') ||
      qLower.includes('what did i do well') ||
      qLower.includes('what i did well') ||
      /why did i get \d+/i.test(qLower) ||
      /why (?:is|was) my (?:hr|score)/i.test(qLower) ||
      /explain my (?:hr|score)/i.test(qLower);

    if (isHrQuery && !qLower.includes('coding') && !qLower.includes('code') && !qLower.includes('test case') && !qLower.includes('test #')) {
      return this.handleHRInterviewChat(userMessage, interviewId, identityId, synthesis);
    }

    // 4. Check for CODING queries (PRIORITY: check coding before generic question numbers to prevent routing "2nd coding question" to aptitude)
    const isCodingQuery =
      qLower.includes('coding') ||
      qLower.includes('code') ||
      qLower.includes('test case') ||
      qLower.includes('test #') ||
      /\btest\s*(?:case\s*)?#?\s*\d+\b/i.test(userMessage) ||
      qLower.includes('tests passed') ||
      qLower.includes('tests failed') ||
      qLower.includes('o(n') ||
      qLower.includes('complexity') ||
      qLower.includes('two pointer') ||
      qLower.includes('nested loop') ||
      qLower.includes('brute force') ||
      qLower.includes('algorithm') ||
      qLower.includes('tle') ||
      qLower.includes('time limit') ||
      qLower.includes('wrong in my') ||
      qLower.includes('what is wrong') ||
      qLower.includes('why did my') ||
      qLower.includes('how to optimize') ||
      qLower.includes('how can i optimize') ||
      qLower.includes('correct approach') ||
      qLower.includes('boundary condition') ||
      qLower.includes('failed test') ||
      qLower.includes('attempt') ||
      qLower.includes('submission') ||
      qLower.includes('progression') ||
      qLower.includes('improve') ||
      /\b(?:problem|coding\s*question)\s*\d+\b/i.test(userMessage) ||
      /\b(?:1st|2nd|3rd|first|second|third)\s*(?:coding\s*)?(?:question|problem)/i.test(userMessage) ||
      (previousContext?.questionIndex !== undefined && (qLower.includes('why') || qLower.includes('fix') || qLower.includes('what about') || qLower.includes('how')));

    if (isCodingQuery) {
      return this.handleCodingChat(userMessage, synthesis, evidence, interviewId, identityId, undefined, previousContext);
    }

    // 4. Check for specific aptitude question queries (e.g. "Q1", "Question 2", "Explain question 3")
    const qNumMatch = userMessage.match(/\b(?:q|question)\s*(\d+)\b/i);
    if (qNumMatch) {
      const qIdx = parseInt(qNumMatch[1], 10) - 1;
      const targetQ = synthesis.aptitudeAnalysis[qIdx];
      if (targetQ) {
        if (qLower.includes('hint')) {
          return this.generateHint(targetQ);
        }
        if (qLower.includes('teach') || qLower.includes('basics')) {
          return this.teachConcept(targetQ);
        }
        if (qLower.includes('similar') || qLower.includes('practice')) {
          return this.generateSimilarQuestion(targetQ, interviewId, identityId);
        }
        if (qLower.includes('mistake') || qLower.includes('why wrong')) {
          return this.explainMistake(targetQ);
        }
        return this.generateExplanation(targetQ);
      }
    }

    // 5. Teaching modes on current context if mentioned
    if (qLower.includes('hint')) {
      const firstWrong = synthesis.aptitudeAnalysis.find(a => !a.isCorrect) || synthesis.aptitudeAnalysis[0];
      if (firstWrong) return this.generateHint(firstWrong);
    }

    if (qLower.includes('teach me') || qLower.includes('teach concept') || qLower.includes('from basics')) {
      const target = synthesis.aptitudeAnalysis.find(a => !a.isCorrect) || synthesis.aptitudeAnalysis[0];
      if (target) return this.teachConcept(target);
    }

    if (qLower.includes('similar question') || qLower.includes('practice question')) {
      const target = synthesis.aptitudeAnalysis.find(a => !a.isCorrect) || synthesis.aptitudeAnalysis[0];
      if (target) return this.generateSimilarQuestion(target, interviewId, identityId);
    }

    // 6. APTITUDE OVERVIEW / MISTAKES
    if (qLower.includes('aptitude') || qLower.includes('mcq') || qLower.includes('math') || qLower.includes('reasoning')) {
      const incorrectQuestions = synthesis.aptitudeAnalysis.filter((a) => !a.isCorrect);

      if (qLower.includes('mistake') || qLower.includes('wrong') || qLower.includes('why')) {
        if (incorrectQuestions.length === 0) {
          return {
            answer: `🎉 **Outstanding performance!** You answered all **${synthesis.summary.aptitudePassed}/${synthesis.summary.aptitudeTotal}** Aptitude questions correctly (${synthesis.summary.aptitudeScore}%).\n\nYou demonstrated strong mathematical and analytical problem-solving skills across all tested topics.`,
            suggestedFollowups: ['Was my coding approach optimal?', 'How can I improve my HR answers?'],
          };
        }

        const firstWrong = incorrectQuestions[0];
        return this.generateExplanation(firstWrong);
      }

      return {
        answer: `### Aptitude Round Evaluation\n\n` +
          `* **Score**: **${synthesis.summary.aptitudePassed}/${synthesis.summary.aptitudeTotal}** (${synthesis.summary.aptitudeScore}%)\n` +
          `* **Correct Answers**: **${synthesis.summary.aptitudePassed}**\n` +
          `* **Mistakes / Unanswered**: **${synthesis.summary.aptitudeTotal - synthesis.summary.aptitudePassed}**\n\n` +
          `Click on any question in the report or ask me "Explain Q1", "Give me a hint for Q2", or "Teach me from basics" to start practicing!`,
        suggestedFollowups: [
          incorrectQuestions[0] ? `Explain my mistake in Q${incorrectQuestions[0].questionNumber}` : 'Explain Q1',
          'Give me a similar question to practice',
          'Was my coding approach optimal?'
        ],
      };
    }

    // 7. HR INTERVIEW FEEDBACK & SCORE EXPLANATION
    if (
      qLower.includes('hr') ||
      qLower.includes('behavioral') ||
      qLower.includes('communication') ||
      (qLower.includes('interview') && !qLower.includes('coding')) ||
      /why did i get \d+/i.test(qLower) ||
      /why (?:is|was) my (?:hr|score)/i.test(qLower) ||
      /explain my (?:hr|score)/i.test(qLower)
    ) {
      const hr = synthesis.hrAnalysis;

      // Look up persisted criterion-level evidence from HR session
      let criteriaBreakdownText = '';
      try {
        const hrRecord = await prisma.interviewHistory.findFirst({
          where: { interviewId, event: 'HR_COMPLETE' },
          orderBy: { timestamp: 'desc' },
        });
        const hrDetails = hrRecord?.details as any;
        const criteriaEvidence = hrDetails?.criteriaEvidence || hrDetails?.evaluation?.criteriaEvidence || [];

        if (Array.isArray(criteriaEvidence) && criteriaEvidence.length > 0) {
          criteriaBreakdownText =
            `\n\n**Traceable Criterion-Level Evidence**:\n` +
            criteriaEvidence
              .map((c: any) => {
                const status = c.score >= c.maxScore ? '✓ Full Credit' : c.score > 0 ? '◐ Partial Credit' : '✗ No Credit';
                const detail = c.evidence ? `Evidence: "${c.evidence}"` : `Reason: ${c.reason}`;
                return `* **${c.criterion}** (${c.score}/${c.maxScore} pts — ${status}): ${detail}`;
              })
              .join('\n');
        }
      } catch {
        // Fall back to standard breakdown
      }

      return {
        answer:
          `### Behavioral & HR Evaluation Evidence\n\n` +
          `* **Overall HR Score**: **${hr.communicationScore}/100**\n` +
          `* **Clarity**: **${hr.clarityScore}/100** | **Relevance**: **${hr.relevanceScore}/100**\n\n` +
          `**Assessment Summary**:\n${hr.overallAssessment}` +
          criteriaBreakdownText +
          `\n\n**Key Strengths Observed**:\n` +
          (hr.strengthsObserved.length > 0 ? hr.strengthsObserved.map((s) => `• ${s}`).join('\n') : '• None recorded (insufficient evidence provided)') +
          `\n\n**Actionable Advice (STAR Framework)**:\n` +
          `${hr.starMethodGuidance}\n\n` +
          `**Targeted Improvements**:\n` +
          (hr.areasToImprove.length > 0 ? hr.areasToImprove.map((a) => `• ${a}`).join('\n') : '• Practice structuring responses using STAR framework'),
        suggestedFollowups: ['How can I format answers with STAR?', 'Was my coding approach optimal?'],
      };
    }

    // 8. GENERAL OVERVIEW
    return {
      answer: `### Performance Summary for ${evidence.interviewTitle}\n\n` +
        `* **Overall Proficiency**: **${synthesis.overallProficiencyScore}/100**\n` +
        `* **Calculation Formula**: \`${synthesis.scoreBreakdown.formula}\`\n\n` +
        `**Key Takeaways**:\n` +
        synthesis.strengths.slice(0, 2).map((s) => `✓ ${s}`).join('\n') + '\n' +
        synthesis.areasToImprove.slice(0, 2).map((a) => `• ${a}`).join('\n') +
        `\n\n**Recommended Next Action**:\n${synthesis.nextActionPlan[0] || 'Practice targeted algorithmic problems on Naan Mudhalvan Sandbox.'}`,
      suggestedFollowups: [
        'Explain my aptitude mistakes',
        'Was my coding approach optimal?',
        'How can I improve my HR answers?',
      ],
    };
  }

  /**
   * Handle structured question context from "Ask AI About This Question" button
   */
  private static handleQuestionContext(payload: any, synthesis: SynthesizedReport) {
    const q = synthesis.aptitudeAnalysis.find(a => a.questionId === payload.questionId) || synthesis.aptitudeAnalysis[0];
    if (!q) {
      return {
        answer: "I don't have enough verified evidence from your interview to answer that.",
        suggestedFollowups: ['Explain my aptitude score'],
      };
    }

    const optList = (q.options || []).map((opt, i) => `  ${q.optionLabels?.[i] || String.fromCharCode(65 + i)}. ${opt}`).join('\n');
    const selectedText = q.selectedOptionIndex !== null 
      ? `Option ${q.optionLabels?.[q.selectedOptionIndex] || String.fromCharCode(65 + q.selectedOptionIndex)} (${q.selectedOptionText})`
      : 'Not Attempted';
    const correctText = `Option ${q.optionLabels?.[q.correctOptionIndex] || String.fromCharCode(65 + q.correctOptionIndex)} (${q.correctOptionText})`;

    const answer = `### Question Analysis: Q${q.questionNumber} (${q.topic})\n\n` +
      `**Question**:\n${q.question}\n\n` +
      `**Options**:\n${optList}\n\n` +
      `* **Your Answer**: \`${selectedText}\` ${q.isCorrect ? '✅ (Correct)' : '❌ (Incorrect)'}\n` +
      `* **Correct Answer**: \`${correctText}\`\n\n` +
      `**Step-by-Step Solution**:\n` +
      q.stepByStepSolution.map((s, i) => `${i + 1}. ${s.replace(/^Step\s*\d*:\s*/i, '')}`).join('\n') +
      `\n\n💡 **Concept to Revise**: *${q.conceptToRevise}*\n\n` +
      `How would you like to proceed? Click one of the teaching modes below:`;

    return {
      answer,
      suggestedFollowups: [
        `💡 Give Me a Hint for Q${q.questionNumber}`,
        `📖 Explain the Answer for Q${q.questionNumber}`,
        `🎓 Teach Me From Basics Q${q.questionNumber}`,
        `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
      ],
      relatedQuestionId: q.questionId,
    };
  }

  /**
   * Handle teaching mode action pills
   */
  private static async handleTeachingMode(
    payload: any,
    synthesis: SynthesizedReport,
    interviewId: string,
    identityId: string
  ) {
    const q = synthesis.aptitudeAnalysis.find(a => a.questionId === payload.questionId) || 
      synthesis.aptitudeAnalysis[payload.questionNumber ? payload.questionNumber - 1 : 0] || 
      synthesis.aptitudeAnalysis[0];

    if (!q) {
      return {
        answer: "I don't have enough verified evidence from your interview to answer that.",
        suggestedFollowups: ['Explain my aptitude score'],
      };
    }

    switch (payload.mode) {
      case 'HINT':
        return this.generateHint(q);
      case 'EXPLAIN':
        return this.generateExplanation(q);
      case 'TEACH_ME':
        return this.teachConcept(q);
      case 'EXPLAIN_MISTAKE':
        return this.explainMistake(q);
      case 'SIMILAR_QUESTION':
        return this.generateSimilarQuestion(q, interviewId, identityId);
      default:
        return this.generateExplanation(q);
    }
  }

  /**
   * Mode 1: Hint Mode (Does NOT reveal the answer)
   */
  private static generateHint(q: DetailedAptitudeAnalysis) {
    const topicLower = (q.topic || '').toLowerCase();
    let hint = '';

    if (topicLower.includes('work')) {
      hint = '💡 **Hint**: Total work is the product of workers and time (`Work = Men × Days`). When the number of workers changes, the total required work remains constant.';
    } else if (topicLower.includes('speed') || topicLower.includes('distance')) {
      hint = '💡 **Hint**: Remember `Distance = Speed × Time`. Check whether unit conversion between km/h and m/s is needed before calculating.';
    } else if (topicLower.includes('profit') || topicLower.includes('loss')) {
      hint = '💡 **Hint**: Percentage gain or loss is always calculated with respect to the Cost Price (`CP`), not the Selling Price.';
    } else if (topicLower.includes('interest')) {
      hint = '💡 **Hint**: For Simple Interest, use `SI = (P × R × T) / 100`. Verify whether the question asks for the interest amount or the total accumulated balance.';
    } else if (topicLower.includes('pipe') || topicLower.includes('cistern')) {
      hint = '💡 **Hint**: Express each pipe’s work as a fraction of the tank filled per hour (`1/A + 1/B - 1/C = 1/Total`).';
    } else if (topicLower.includes('permutation') || topicLower.includes('combination')) {
      hint = '💡 **Hint**: Determine whether order matters. If order matters, use Permutations (`nPr`). If grouping matters, use Combinations (`nCr`).';
    } else {
      hint = `💡 **Hint for ${q.topic}**: Identify the independent variables and write down the governing relationship before substituting numbers.`;
    }

    return {
      answer: `### Hint for Q${q.questionNumber}: ${q.topic}\n\n${hint}\n\nCan you try applying this clue to solve the problem? When you are ready, you can ask me to explain the full solution.`,
      suggestedFollowups: [
        `📖 Explain the Answer for Q${q.questionNumber}`,
        `🎓 Teach Me From Basics Q${q.questionNumber}`,
        `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
      ],
      relatedQuestionId: q.questionId,
      mode: 'HINT',
    };
  }

  /**
   * Mode 2: Explain Mode
   */
  private static generateExplanation(q: DetailedAptitudeAnalysis) {
    const correctLabel = q.optionLabels?.[q.correctOptionIndex] || String.fromCharCode(65 + q.correctOptionIndex);
    const selectedLabel = q.selectedOptionIndex !== null ? (q.optionLabels?.[q.selectedOptionIndex] || String.fromCharCode(65 + q.selectedOptionIndex)) : null;

    let explanation = `### Detailed Solution: Q${q.questionNumber} (${q.topic})\n\n` +
      `**Question**:\n${q.question}\n\n` +
      `* **Correct Answer**: **Option ${correctLabel} — ${q.correctOptionText}**\n` +
      `* **Your Selected Answer**: \`${selectedLabel ? `Option ${selectedLabel} (${q.selectedOptionText})` : 'Not Attempted'}\`\n\n` +
      `**Step-by-Step Reasoning**:\n` +
      q.stepByStepSolution.map((s, i) => `${i + 1}. ${s.replace(/^Step\s*\d*:\s*/i, '')}`).join('\n') +
      `\n\n**Why This Is Correct**:\n${q.whyCorrect}`;

    if (q.whyIncorrect && !q.isCorrect) {
      explanation += `\n\n**Mistake Diagnosis**:\n${q.whyIncorrect}`;
    }

    return {
      answer: explanation,
      suggestedFollowups: [
        `🎓 Teach Me From Basics Q${q.questionNumber}`,
        `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
        `💡 Give Me a Hint for Q${q.questionNumber}`,
      ],
      relatedQuestionId: q.questionId,
      mode: 'EXPLAIN',
    };
  }

  /**
   * Mode 3: Explain Mistake
   */
  private static explainMistake(q: DetailedAptitudeAnalysis) {
    const correctLabel = q.optionLabels?.[q.correctOptionIndex] || String.fromCharCode(65 + q.correctOptionIndex);
    const selectedLabel = q.selectedOptionIndex !== null ? (q.optionLabels?.[q.selectedOptionIndex] || String.fromCharCode(65 + q.selectedOptionIndex)) : 'None';

    if (q.isCorrect) {
      return {
        answer: `🎉 You answered **Q${q.questionNumber}** correctly with Option ${correctLabel} (${q.correctOptionText})! There was no mistake in this question.`,
        suggestedFollowups: [`🧠 Give Me a Similar Question for Q${q.questionNumber}`, 'Was my coding approach optimal?'],
        relatedQuestionId: q.questionId,
      };
    }

    const answer = `### Mistake Analysis: Q${q.questionNumber} (${q.topic})\n\n` +
      `* **You Selected**: Option ${selectedLabel} (${q.selectedOptionText || 'Not Attempted'})\n` +
      `* **Correct Answer**: Option ${correctLabel} (${q.correctOptionText})\n\n` +
      `**Why Your Selected Option Was Incorrect**:\n` +
      `${q.whyIncorrect || 'The selected option does not satisfy the required mathematical equation.'}\n\n` +
      `**Correct Mathematical Method**:\n` +
      q.stepByStepSolution.map((s, i) => `${i + 1}. ${s.replace(/^Step\s*\d*:\s*/i, '')}`).join('\n') +
      `\n\n💡 **Concept to Revise**: *${q.conceptToRevise}*`;

    return {
      answer,
      suggestedFollowups: [
        `🎓 Teach Me From Basics Q${q.questionNumber}`,
        `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
      ],
      relatedQuestionId: q.questionId,
      mode: 'EXPLAIN_MISTAKE',
    };
  }

  /**
   * Mode 4: Teach Me From Basics (Uses Groq LLM)
   */
  private static async teachConcept(q: DetailedAptitudeAnalysis) {
    const correctLabel = q.optionLabels?.[q.correctOptionIndex] || String.fromCharCode(65 + q.correctOptionIndex);

    // Call Groq LLM for comprehensive structured tutorial
    if (process.env.LLM_API_KEY) {
      try {
        const apiKey = process.env.LLM_API_KEY;
        const provider = process.env.LLM_PROVIDER || 'GROQ';
        const url = provider === 'GROQ'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
        const model = provider === 'GROQ' ? (process.env.GROQ_MODEL || 'qwen/qwen3.6-27b') : 'gpt-3.5-turbo';

        const optList = (q.options || []).map((o, idx) => `  ${q.optionLabels?.[idx] || String.fromCharCode(65 + idx)}. ${o}`).join('\n');
        const prompt = `You are a master teacher helping an engineering student master aptitude concepts for placements.

Topic: ${q.topic}
Question: ${q.question}
Options:
${optList}
Correct Answer: Option ${correctLabel} (${q.correctOptionText})

Teach this topic from first principles using this structured format:
1. **Concept Overview**: Explain the core idea in 2-3 simple sentences.
2. **Core Formula & Rule**: State the mathematical formulas clearly.
3. **Simple Worked Example**: Provide a simple walkthrough with different numbers.
4. **Solving the Interview Question**: Solve the student's question step-by-step.
5. **Common Traps & Mistakes**: Highlight 2 common pitfalls students make in ${q.topic}.
6. **Speed Shortcut**: Give a quick calculation tip.`;

        const aiRes = await axios.post(url, {
          model,
          messages: [
            { role: 'system', content: 'You are an educational aptitude tutor. Output structured, friendly, clear explanations. Do not use <think> tags.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 600,
          temperature: 0.4
        }, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 6000
        });

        let aiText = aiRes.data?.choices?.[0]?.message?.content || '';
        aiText = aiText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (aiText.length > 50) {
          return {
            answer: `### Masterclass: ${q.topic} (From Basics)\n\n${aiText}`,
            suggestedFollowups: [
              `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
              `📖 Explain the Answer for Q${q.questionNumber}`,
            ],
            relatedQuestionId: q.questionId,
            mode: 'TEACH_ME',
          };
        }
      } catch (err: any) {
        console.warn('Groq LLM Teach Me call failed:', err.message);
      }
    }

    // Fallback if LLM unavailable
    const fallbackAnswer = `### Masterclass: ${q.topic} (From Basics)\n\n` +
      `1. **Concept Overview**:\n` +
      `Problems in **${q.topic}** evaluate your ability to formulate algebraic constraints and compute rates of change.\n\n` +
      `2. **Core Rule & Formula**:\n` +
      `Identify the conserved quantity (e.g., Total Work = Workers × Time, Distance = Speed × Time).\n\n` +
      `3. **Applying to Your Question**:\n` +
      q.stepByStepSolution.map((s, i) => `${i + 1}. ${s.replace(/^Step\s*\d*:\s*/i, '')}`).join('\n') +
      `\n\n4. **Correct Answer**: Option ${correctLabel} (${q.correctOptionText}).\n\n` +
      `Would you like to test your understanding with a fresh practice question?`;

    return {
      answer: fallbackAnswer,
      suggestedFollowups: [
        `🧠 Give Me a Similar Question for Q${q.questionNumber}`,
        `📖 Explain the Answer for Q${q.questionNumber}`,
      ],
      relatedQuestionId: q.questionId,
      mode: 'TEACH_ME',
    };
  }

  /**
   * Mode 5: Similar Practice Question (Uses Groq LLM, Persists Server-side with practiceQuestionId)
   */
  private static async generateSimilarQuestion(
    q: DetailedAptitudeAnalysis,
    interviewId: string,
    identityId: string
  ) {
    const practiceQuestionId = crypto.randomUUID();
    let generatedPQ: {
      question: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
    } | null = null;

    if (process.env.LLM_API_KEY) {
      try {
        const apiKey = process.env.LLM_API_KEY;
        const provider = process.env.LLM_PROVIDER || 'GROQ';
        const url = provider === 'GROQ'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
        const model = provider === 'GROQ' ? (process.env.GROQ_MODEL || 'qwen/qwen3.6-27b') : 'gpt-3.5-turbo';

        const prompt = `Based on the following aptitude question in "${q.topic}":
"${q.question}"

Generate a new, structurally similar practice question with DIFFERENT numbers.
Make sure one of the 4 options is mathematically correct.

Return ONLY a JSON object with this exact schema:
{
  "question": "...",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctOptionIndex": 0,
  "explanation": "Step-by-step resolution..."
}`;

        const aiRes = await axios.post(url, {
          model,
          messages: [
            { role: 'system', content: 'You are a question generator. Output ONLY raw valid JSON. No markdown code blocks, no backticks, no think tags.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 350,
          temperature: 0.5
        }, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 6000
        });

        let content = aiRes.data?.choices?.[0]?.message?.content || '';
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.question && Array.isArray(parsed.options) && parsed.options.length === 4 && typeof parsed.correctOptionIndex === 'number') {
            generatedPQ = parsed;
          }
        }
      } catch (err: any) {
        console.warn('Groq similar question generation error:', err.message);
      }
    }

    // Deterministic fallback if LLM unavailable
    if (!generatedPQ) {
      const topicLower = (q.topic || '').toLowerCase();
      if (topicLower.includes('work')) {
        generatedPQ = {
          question: '10 workers can complete a job in 24 days. In how many days can 15 workers complete the same job?',
          options: ['12 days', '16 days', '18 days', '20 days'],
          correctOptionIndex: 1, // 16 days (10*24 = 240 / 15 = 16)
          explanation: '10 workers × 24 days = 240 man-days. Therefore, 240 ÷ 15 workers = 16 days.',
        };
      } else if (topicLower.includes('speed') || topicLower.includes('distance')) {
        generatedPQ = {
          question: 'A train travels at 72 km/h. How many meters does it travel in 15 seconds?',
          options: ['250 meters', '300 meters', '350 meters', '400 meters'],
          correctOptionIndex: 1, // 300 meters (72 * 5/18 = 20 m/s * 15 = 300m)
          explanation: 'Convert 72 km/h to m/s: 72 × (5/18) = 20 m/s. In 15 seconds: 20 m/s × 15 s = 300 meters.',
        };
      } else {
        generatedPQ = {
          question: 'If an item is purchased for ₹400 and sold for ₹500, what is the profit percentage?',
          options: ['20%', '25%', '30%', '15%'],
          correctOptionIndex: 1, // 25% ((100/400)*100 = 25%)
          explanation: 'Profit = ₹500 - ₹400 = ₹100. Profit percentage = (100 / 400) × 100 = 25%.',
        };
      }
    }

    const optionLabels = ['A', 'B', 'C', 'D'];

    // Persist practice question in InterviewHistory with correctOptionIndex (never sent to client before answer)
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'REPORT_PRACTICE_QUESTION',
        details: {
          practiceQuestionId,
          relatedQuestionId: q.questionId,
          question: generatedPQ.question,
          options: generatedPQ.options,
          optionLabels,
          correctOptionIndex: generatedPQ.correctOptionIndex,
          explanation: generatedPQ.explanation,
          createdAt: new Date().toISOString(),
        } as any,
      },
    });

    const optList = generatedPQ.options.map((o, idx) => `**${optionLabels[idx]}.** ${o}`).join('\n');
    const answer = `### 🧠 Similar Practice Question: ${q.topic}\n\n` +
      `**Question**:\n${generatedPQ.question}\n\n` +
      `**Options**:\n${optList}\n\n` +
      `*Click your answer below or type "My answer is A/B/C/D":*`;

    return {
      answer,
      suggestedFollowups: [
        'My answer is A',
        'My answer is B',
        'My answer is C',
        'My answer is D',
      ],
      relatedQuestionId: q.questionId,
      mode: 'SIMILAR_QUESTION',
      practiceQuestion: {
        practiceQuestionId,
        question: generatedPQ.question,
        options: generatedPQ.options,
        optionLabels,
        relatedQuestionId: q.questionId,
      },
    };
  }

  /**
   * Master Coding Query Handler
   * Grounds all answers strictly in actual candidate submission data and real test execution facts.
   * Answers "What is wrong in my 2nd coding question?" in the required structure with zero hallucination.
   */
  private static async handleCodingChat(
    userMessage: string,
    synthesis: SynthesizedReport,
    evidence: CompleteSessionEvidence,
    interviewId: string,
    identityId: string,
    parsedPayload?: any,
    previousContext?: { questionIndex?: number; attemptNumber?: number }
  ): Promise<ChatRouteResponse> {
    const codingProblems = synthesis.codingAnalysis || [];
    if (codingProblems.length === 0) {
      return {
        answer: 'No coding problem evidence was recorded for this session.',
        suggestedFollowups: ['Explain my aptitude score', 'How was my HR interview?'],
      };
    }

    const msg = userMessage.toLowerCase();

    // 1. Resolve Target Problem Index (0-based)
    let targetIndex: number | null = null;

    if (parsedPayload?.problemNumber) {
      targetIndex = Math.max(0, Math.min(codingProblems.length - 1, parsedPayload.problemNumber - 1));
    } else if (parsedPayload?.questionId) {
      const foundIdx = codingProblems.findIndex((p) => p.questionId === parsedPayload.questionId);
      if (foundIdx !== -1) targetIndex = foundIdx;
    } else if (
      /\b(?:2nd|second)\s+(?:coding\s+)?(?:question|problem)\b/i.test(msg) ||
      /\bproblem\s*2\b/i.test(msg) ||
      /\bcoding\s*2\b/i.test(msg)
    ) {
      targetIndex = codingProblems.length > 1 ? 1 : 0;
    } else if (
      /\b(?:3rd|third)\s+(?:coding\s+)?(?:question|problem)\b/i.test(msg) ||
      /\bproblem\s*3\b/i.test(msg) ||
      /\bcoding\s*3\b/i.test(msg)
    ) {
      targetIndex = codingProblems.length > 2 ? 2 : 0;
    } else if (
      /\b(?:1st|first)\s+(?:coding\s+)?(?:question|problem)\b/i.test(msg) ||
      /\bproblem\s*1\b/i.test(msg) ||
      /\bcoding\s*1\b/i.test(msg)
    ) {
      targetIndex = 0;
    } else {
      // Check if title or keyword mentioned
      const titleMatch = codingProblems.findIndex((p) => p.title && msg.includes(p.title.toLowerCase()));
      if (titleMatch !== -1) {
        targetIndex = titleMatch;
      }
    }

    // If no explicit question was mentioned, check conversational context from previous turn
    if (targetIndex === null) {
      if (previousContext?.questionIndex !== undefined && previousContext.questionIndex >= 0 && previousContext.questionIndex < codingProblems.length) {
        targetIndex = previousContext.questionIndex;
      } else if (codingProblems.length === 1) {
        targetIndex = 0;
      } else {
        // Disambiguation Prompt: Candidate asked a general coding question without specifying problem
        const optionsList = codingProblems.map((cp, idx) => {
          const best = cp.bestResult || { passedCount: cp.testsPassed || 0, totalCount: cp.testsTotal || 0, status: cp.finalVerdict };
          const symbol = best.status === 'ACCEPTED' ? '✅' : best.passedCount > 0 ? '⚠️' : '❌';
          return `${idx + 1}. **Problem #${idx + 1}: ${cp.title}** (${symbol} ${best.passedCount}/${best.totalCount} tests passed · ${best.status || 'UNSOLVED'})`;
        }).join('\n');

        return {
          answer: `I'd be glad to help analyze your code! You attempted **${codingProblems.length} coding problems** in this assessment. Which one would you like to investigate?\n\n${optionsList}\n\nPlease reply with **"Problem 1"** or **"Problem 2"**, or click one of the suggestions below.`,
          suggestedFollowups: codingProblems.map((_, idx) => `What is wrong in Problem #${idx + 1}?`),
        };
      }
    }

    const prob: DetailedCodingAnalysis = codingProblems[targetIndex];
    const problemNum = targetIndex + 1;
    const isAccepted = prob.finalVerdict === 'ACCEPTED' || prob.finalVerdict === 'PASSED';
    const failedTests = prob.failedTests || [];
    const testResults = prob.testResults || [];
    const firstFailure = failedTests[0] || null;
    const attempts = prob.attempts || [];

    // Check for Missing Submission/Execution Evidence
    const hasAttempts = attempts.length > 0;
    const hasCode = !!prob.submittedCode || hasAttempts;
    const hasTests = (testResults.length > 0) || hasAttempts;

    if (!hasCode || !hasTests) {
      return {
        answer: `I can identify Question ${problemNum} (${prob.title}), but I don't have the submission and test evidence required to determine the exact reason for failure. No code submissions were recorded for this problem in your session.`,
        suggestedFollowups: codingProblems.length > 1 ? [`What is wrong in Problem #${targetIndex === 0 ? 2 : 1}?`] : ['Explain my aptitude score'],
        relatedQuestionId: prob.questionId,
        contextQuestionIndex: targetIndex,
      };
    }

    // 2. Attempt Progression Query ("Did I improve between attempts?", "Progression")
    if (
      msg.includes('progression') ||
      msg.includes('improve') ||
      msg.includes('between attempt') ||
      msg.includes('from attempt') ||
      msg.includes('compare attempt') ||
      msg.includes('how did my attempt')
    ) {
      const steps = prob.progression?.steps || attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        passedCount: a.passedCount,
        totalCount: a.totalTests,
        status: a.status,
        symbol: a.status === 'ACCEPTED' ? '✅' : a.passedCount > 0 ? '⚠️' : '❌',
      }));

      const stepsText = steps.length > 0
        ? steps.map((s) => `* **Attempt ${s.attemptNumber}**: ${s.passedCount}/${s.totalCount} tests passed ${s.symbol} (${s.status})`).join('\n')
        : 'Single attempt submitted.';

      const progressionExplanation = prob.progression?.explanation || (steps.length > 1
        ? `Across ${steps.length} attempts, you progressed from ${steps[0].passedCount}/${steps[0].totalCount} to ${steps[steps.length - 1].passedCount}/${steps[steps.length - 1].totalCount} tests passing.`
        : 'One attempt was submitted for this problem.');

      return {
        answer: `### 📈 Attempt Progression: ${prob.title} (Problem #${problemNum})\n\n` +
          `**Attempt History**:\n${stepsText}\n\n` +
          `**Progression Summary**:\n${progressionExplanation}\n\n` +
          `Would you like to examine a specific attempt? Ask "What happened in Attempt 1?" or click below.`,
        suggestedFollowups: attempts.slice(0, 3).map((a) => `What happened in Attempt #${a.attemptNumber}?`),
        relatedQuestionId: prob.questionId,
        contextQuestionIndex: targetIndex,
      };
    }

    // 3. Specific Attempt Query ("What about my first attempt?", "Why did attempt 2 pass?", "Attempt 1")
    const attemptMatch = msg.match(/\b(?:attempt|submission)\s*#?\s*(\d+)\b/i) ||
      (msg.includes('first attempt') || msg.includes('1st attempt') ? [null, '1'] :
       msg.includes('second attempt') || msg.includes('2nd attempt') ? [null, '2'] :
       msg.includes('third attempt') || msg.includes('3rd attempt') ? [null, '3'] :
       msg.includes('last attempt') || msg.includes('latest attempt') ? [null, String(attempts.length || 1)] : null);

    const reqAttemptNum = parsedPayload?.attemptNumber || (attemptMatch ? parseInt(attemptMatch[1], 10) : undefined);

    if (reqAttemptNum !== undefined) {
      const specificAttempt = attempts.find((a) => a.attemptNumber === reqAttemptNum);
      if (!specificAttempt) {
        return {
          answer: `I couldn't find Attempt #${reqAttemptNum} for Problem #${problemNum} (${prob.title}). Recorded attempts: ${attempts.map((a) => '#' + a.attemptNumber).join(', ') || 'None'}.`,
          suggestedFollowups: attempts.map((a) => `What happened in Attempt #${a.attemptNumber}?`),
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      }

      const attAi = specificAttempt.aiAnalysis;
      const isAttAccepted = specificAttempt.status === 'ACCEPTED' || specificAttempt.passedCount === specificAttempt.totalTests;
      const attFailed = specificAttempt.testResults?.filter((t: any) => !t.passed) || [];

      if (isAttAccepted) {
        return {
          answer: `### Code Analysis: Attempt #${reqAttemptNum} — ${prob.title} (Problem #${problemNum})\n\n` +
            `✅ **Attempt #${reqAttemptNum} is ACCEPTED!** (${specificAttempt.passedCount}/${specificAttempt.totalTests} tests passed)\n\n` +
            `* **Why It Works**: ${attAi?.whyItWorks || 'All test case constraints, edge cases, and runtime boundaries passed successfully.'}\n` +
            `* **Algorithm**: ${attAi?.algorithmApproach || prob.approachClassification}\n` +
            `* **Key Invariants**: ${attAi?.keyInvariants?.join(', ') || 'Invariant conditions held across all test iterations.'}\n` +
            `* **Complexity (Source: AI)**: \`${attAi?.timeComplexity || prob.candidateTimeComplexity}\` time, \`${attAi?.spaceComplexity || prob.candidateSpaceComplexity}\` space\n\n` +
            (attAi?.optimizedCode ? `**Optimization Opportunity**:\n\`\`\`${specificAttempt.language?.toLowerCase() || 'python'}\n${attAi.optimizedCode}\n\`\`\`\n` : 'Your solution is asymptotically optimal.'),
          suggestedFollowups: [
            `Did I improve between attempts?`,
            `How can I optimize Problem #${problemNum}?`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
          contextAttemptNumber: reqAttemptNum,
        };
      } else {
        const firstFail = attFailed[0] || (attAi?.failedTestCases && attAi.failedTestCases[0]);
        const cat = firstFail?.failureCategory || (specificAttempt.compileError ? 'COMPILATION_ERROR' : 'LOGICAL_ERROR');
        const why = attAi?.whyItFailed || firstFail?.whyItFails || 'Execution did not produce the expected output.';
        const fix = Array.isArray(attAi?.howToFix) ? attAi.howToFix.join('\n') : (firstFail?.howToFix || 'Correct the loop bounds and logic conditions.');

        return {
          answer: `### Diagnostic Report: Attempt #${reqAttemptNum} — ${prob.title} (Problem #${problemNum})\n\n` +
            `* **Status**: **FAILED** (${specificAttempt.passedCount}/${specificAttempt.totalTests} tests passed)\n` +
            `* **Category**: \`${cat}\`\n\n` +
            (firstFail ? `**Failed Test Case #${firstFail.testCaseNumber || 1}**:\n` +
              `* **Input**: \`\`\`\n${firstFail.input || 'N/A'}\n\`\`\`\n` +
              `* **Expected Output**: \`\`\`\n${firstFail.expectedOutput || 'N/A'}\n\`\`\`\n` +
              `* **Your Output**: \`\`\`\n${firstFail.actualOutput || 'N/A'}\n\`\`\`\n\n` : '') +
            `**Why It Failed**:\n${why}\n\n` +
            `**How to Fix**:\n${fix}\n\n` +
            (attAi?.correctedCode ? `**AI Corrected Code**:\n\`\`\`${specificAttempt.language?.toLowerCase() || 'python'}\n${attAi.correctedCode}\n\`\`\`\n\n` : '') +
            `> ⚠️ **Note**: This change is expected to address the observed failure, but it has not been verified against the test suite.`,
          suggestedFollowups: [
            `Did I improve between attempts?`,
            `How can I optimize Problem #${problemNum}?`,
            `Show me the correct approach for Problem #${problemNum}`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
          contextAttemptNumber: reqAttemptNum,
        };
      }
    }

    // 4. Specific Test Case Failure Query ("Why did test case 4 fail?", "Test case 3")
    const specificTCMatch = msg.match(/\btest\s*(?:case\s*)?#?\s*(\d+)\b/i);
    if (specificTCMatch) {
      const reqTCNum = parseInt(specificTCMatch[1], 10);
      const foundFailed = failedTests.find((f) => f.testCaseNumber === reqTCNum);
      const foundTC = testResults.find((t) => t.testCaseNumber === reqTCNum);

      if (foundFailed) {
        const answer = `### Test Case #${reqTCNum} Failure Diagnostics: ${prob.title}\n\n` +
          `* **Status**: **FAILED**\n` +
          `* **Failure Category**: \`${foundFailed.failureCategory}\`\n\n` +
          `**Input**:\n\`\`\`\n${foundFailed.input}\n\`\`\`\n\n` +
          `**Expected Output**:\n\`\`\`\n${foundFailed.expectedOutput}\n\`\`\`\n\n` +
          `**Your Output**:\n\`\`\`\n${foundFailed.actualOutput}\n\`\`\`\n\n` +
          `**Why It Failed**:\n${foundFailed.whyItFails}\n\n` +
          `**Problematic Logic in Your Code**:\n` +
          `* **Location**: ${foundFailed.lineLocation}\n` +
          `\`\`\`${prob.language?.toLowerCase() || 'text'}\n${foundFailed.problematicLogic}\n\`\`\`\n\n` +
          `**How to Fix**:\n${foundFailed.howToFix}\n\n` +
          `> ⚠️ **Note**: This change is expected to address the observed failure, but it has not been verified against the test suite.`;

        return {
          answer,
          suggestedFollowups: [
            `How can I optimize Problem #${problemNum}?`,
            `Show me the correct approach for Problem #${problemNum}`,
            `Did I make a boundary condition mistake?`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      } else if (foundTC && foundTC.passed) {
        return {
          answer: `### Test Case #${reqTCNum} Result: ${prob.title}\n\n` +
            `✓ **Test Case #${reqTCNum} PASSED!**\n\n` +
            `* **Input**: \`\`\`\n${foundTC.input}\n\`\`\`\n` +
            `* **Expected Output**: \`\`\`\n${foundTC.expectedOutput}\n\`\`\`\n` +
            `* **Your Output**: \`\`\`\n${foundTC.actualOutput}\n\`\`\`\n\n` +
            `Your code handled this case correctly. The issues in your submission occurred on other test cases (${failedTests.map((f) => `#${f.testCaseNumber}`).join(', ') || 'remaining tests'}).`,
          suggestedFollowups: [
            failedTests[0] ? `Why did test case ${failedTests[0].testCaseNumber} fail?` : `What is wrong in my code?`,
            `How can I optimize Problem #${problemNum}?`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      } else {
        return {
          answer: `I don't have enough execution evidence to determine the exact reason for Test Case #${reqTCNum}. ` +
            `The recorded test cases for **${prob.title}** are: ${testResults.map((t) => `#${t.testCaseNumber}`).join(', ') || 'none'}.`,
          suggestedFollowups: [
            `What is wrong in my ${problemNum === 1 ? '1st' : '2nd'} coding question?`,
            `Show me the correct approach`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      }
    }

    // 5. Complexity / Optimization Query ("Why is my solution O(n²)?", "How can I optimize it?")
    if (
      msg.includes('complexity') ||
      msg.includes('o(n') ||
      msg.includes('optimize') ||
      msg.includes('better approach') ||
      parsedPayload?.mode === 'COMPLEXITY'
    ) {
      const comp = prob.complexityAnalysis;
      const answer = `### Algorithmic Complexity & Optimization: ${prob.title}\n\n` +
        `* **Your Approach**: **${comp?.candidateApproach || prob.approachClassification}**\n` +
        `* **Current Time Complexity**: \`${prob.candidateTimeComplexity}\`\n` +
        `* **Current Space Complexity**: \`${prob.candidateSpaceComplexity}\`\n` +
        `* **Target Optimal Complexity**: \`${prob.expectedComplexity}\` (${prob.expectedSpaceComplexity || 'O(1)'} space)\n\n` +
        `**Complexity Analysis & Constraint Impact**:\n` +
        `${comp?.reason || 'Avoid nested loops by maintaining state during a single pass.'}\n\n` +
        `**Optimal Algorithm Strategy**:\n` +
        `Use **${comp?.optimalApproach || 'Optimal Pattern'}**.\n\n` +
        `**Key Idea**:\n` +
        `${prob.keyLearning}`;

      return {
        answer,
        suggestedFollowups: [
          `What is wrong in my code?`,
          `Show me the correct approach for Problem #${problemNum}`,
          `Which concept did I misunderstand?`,
        ],
        relatedQuestionId: prob.questionId,
        contextQuestionIndex: targetIndex,
      };
    }

    // 6. Boundary Condition Query ("Did I make a boundary condition mistake?")
    if (msg.includes('boundary') || msg.includes('edge case')) {
      const boundaryFailures = failedTests.filter((f) => f.failureCategory === 'BOUNDARY_ERROR');
      if (boundaryFailures.length > 0) {
        const bf = boundaryFailures[0];
        const answer = `### Boundary Condition Analysis: ${prob.title}\n\n` +
          `⚠️ **Yes, your solution failed on a boundary condition (Test Case #${bf.testCaseNumber}).**\n\n` +
          `* **Input**: \`\`\`\n${bf.input}\n\`\`\`\n` +
          `* **Expected**: \`\`\`\n${bf.expectedOutput}\n\`\`\`\n` +
          `* **Your Output**: \`\`\`\n${bf.actualOutput}\n\`\`\`\n\n` +
          `**Why it failed**:\n${bf.whyItFails}\n\n` +
          `**How to fix**:\n${bf.howToFix}\n\n` +
          `> ⚠️ **Note**: This change is expected to address the observed failure, but it has not been verified against the test suite.`;

        return {
          answer,
          suggestedFollowups: [
            `What else is wrong in my code?`,
            `Show me the correct approach`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      } else if (failedTests.length > 0) {
        return {
          answer: `### Boundary Condition Analysis: ${prob.title}\n\n` +
            `Your code did not fail on a standard boundary/edge condition; instead, the failure is categorized as **\`${failedTests[0].failureCategory}\`** on Test Case #${failedTests[0].testCaseNumber}.\n\n` +
            `**Root cause**:\n${failedTests[0].whyItFails}`,
          suggestedFollowups: [
            `Why did test case ${failedTests[0].testCaseNumber} fail?`,
            `How can I fix it?`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      } else {
        return {
          answer: `### Boundary Condition Analysis: ${prob.title}\n\n` +
            `🎉 Your solution passed all tested boundary conditions and normal test cases without boundary errors!`,
          suggestedFollowups: [
            `How can I optimize Problem #${problemNum}?`,
            `Explain my aptitude mistakes`,
          ],
          relatedQuestionId: prob.questionId,
          contextQuestionIndex: targetIndex,
        };
      }
    }

    // 7. Accepted Solution Analysis
    if (isAccepted) {
      const answer = `### Code Analysis: ${prob.title} (Problem #${problemNum})\n\n` +
        `🎉 **Outstanding work! Your solution is ACCEPTED.**\n\n` +
        `1. **Problem**: ${prob.title} (${prob.pattern || prob.topic} · ${prob.difficulty})\n` +
        `2. **Your Approach**: ${prob.complexityAnalysis?.candidateApproach || prob.approachClassification}\n` +
        `3. **Tests Passed**: **${prob.testsPassed} / ${prob.testsTotal}** passed (100%)\n` +
        `4. **Tests Failed**: None — all test cases passed successfully.\n` +
        `5. **Time Complexity**: \`${prob.candidateTimeComplexity}\` (Optimal: \`${prob.expectedComplexity}\`)\n` +
        `6. **Space Complexity**: \`${prob.candidateSpaceComplexity}\`\n` +
        `7. **Constraint Suitability**: ${prob.complexityAnalysis?.reason || 'Executes well within runtime constraints.'}\n` +
        `8. **What You Did Well**:\n${prob.whatYouDidCorrectly?.map((w) => `• ${w}`).join('\n') || '• Clean logical structure'}\n` +
        `9. **Clean Code Recommendation**: Ensure variable names are self-documenting and keep modularity high.\n` +
        `10. **Key Learning**: ${prob.keyLearning}`;

      return {
        answer,
        suggestedFollowups: [
          `How was my HR interview?`,
          `Explain my aptitude mistakes`,
          `What should I practice next?`,
        ],
        relatedQuestionId: prob.questionId,
        contextQuestionIndex: targetIndex,
        contextAttemptNumber: prob.bestResult?.attemptNumber || attempts.length,
      };
    }

    // 8. Compilation Failure
    if (!firstFailure && prob.compileOutput) {
      const answer = `### Compilation Failure Diagnostics: ${prob.title} (Problem #${problemNum})\n\n` +
        `1. **Problem**: ${prob.title} (${prob.pattern || prob.topic} · ${prob.difficulty})\n` +
        `2. **Your Approach**: Code submission in ${prob.language}\n` +
        `3. **Tests Passed**: 0 / ${prob.testsTotal}\n` +
        `4. **Tests Failed**: All (Code did not compile)\n` +
        `5. **Exact Failure**: \`COMPILATION_ERROR\`\n` +
        `\`\`\`\n${prob.compileOutput}\n\`\`\`\n` +
        `6. **Why It Failed**: The compiler encountered syntax, type mismatch, or missing import errors before runtime.\n` +
        `7. **Problem in Your Code**: Review header declarations and syntax delimiters in your submitted code.\n` +
        `8. **How to Fix It**: Fix the syntax error indicated in the compiler output above and resubmit.\n` +
        `9. **Complexity**: Invalid until compilation succeeds.\n` +
        `10. **What to Learn**: Always verify compilation locally and ensure bracket pairs match.`;

      return {
        answer,
        suggestedFollowups: [
          `Show me the correct approach for Problem #${problemNum}`,
          `Teach me the pattern for Problem #${problemNum}`,
        ],
        relatedQuestionId: prob.questionId,
        contextQuestionIndex: targetIndex,
      };
    }

    // 9. General / Failure Query ("What is wrong in my 2nd coding question?") — 10-POINT EXACT SPECIFICATION
    const ft = firstFailure || {
      testCaseNumber: 1,
      input: 'N/A',
      expectedOutput: 'N/A',
      actualOutput: 'N/A',
      failureCategory: 'LOGICAL_ERROR',
      whyItFails: 'Execution did not produce the expected result.',
      lineLocation: 'Main function block',
      problematicLogic: prob.submittedCode?.slice(0, 120) || 'N/A',
      howToFix: 'Review the condition logic and algorithm approach.',
    };

    const answer = `### Diagnostic Report: ${prob.title} (Problem #${problemNum})\n\n` +
      `1. **Problem**: **${prob.title}** (${prob.pattern || prob.topic} · ${prob.difficulty})\n\n` +
      `2. **Your Approach**: **${prob.complexityAnalysis?.candidateApproach || prob.approachClassification}**\n\n` +
      `3. **Tests Passed**: **${prob.testsPassed} / ${prob.testsTotal}** passed\n\n` +
      `4. **Tests Failed**: **${failedTests.map((f) => `Test Case #${f.testCaseNumber}`).join(', ') || 'Test Case #' + ft.testCaseNumber}**\n\n` +
      `5. **Exact Failure** (Test Case #${ft.testCaseNumber}):\n` +
      `* **Status**: FAILED\n` +
      `* **Failure Category**: \`${ft.failureCategory}\`\n` +
      `* **Input**:\n\`\`\`\n${ft.input}\n\`\`\`\n` +
      `* **Expected Output**:\n\`\`\`\n${ft.expectedOutput}\n\`\`\`\n` +
      `* **Your Output**:\n\`\`\`\n${ft.actualOutput}\n\`\`\`\n\n` +
      `6. **Why It Failed**:\n${ft.whyItFails}\n\n` +
      `7. **Problem in Your Code**:\n` +
      `* **Location**: ${ft.lineLocation}\n` +
      `\`\`\`${prob.language?.toLowerCase() || 'text'}\n${ft.problematicLogic}\n\`\`\`\n\n` +
      `8. **How to Fix It**:\n` +
      `${prob.howToFix?.map((step, idx) => `${idx + 1}. ${step}`).join('\n') || ft.howToFix}\n\n` +
      `9. **Complexity**:\n` +
      `* **Current**: \`${prob.candidateTimeComplexity}\` time, \`${prob.candidateSpaceComplexity}\` space (${prob.complexityAnalysis?.candidateApproach})\n` +
      `* **Optimal**: \`${prob.expectedComplexity}\` time, \`${prob.expectedSpaceComplexity || 'O(1)'}\` space (${prob.complexityAnalysis?.optimalApproach})\n` +
      `* **Impact**: ${prob.complexityAnalysis?.reason || 'Switching to optimal approach avoids excessive operations.'}\n\n` +
      `10. **What to Learn**:\n${prob.keyLearning}\n\n` +
      `> ⚠️ **Note**: This change is expected to address the observed failure, but it has not been verified against the test suite.`;

    return {
      answer,
      suggestedFollowups: [
        `Why did test case ${ft.testCaseNumber} fail?`,
        `Why is my solution ${prob.candidateTimeComplexity}?`,
        `How can I optimize Problem #${problemNum}?`,
        `Show me the correct approach for Problem #${problemNum}`,
      ],
      relatedQuestionId: prob.questionId,
      contextQuestionIndex: targetIndex,
      contextAttemptNumber: prob.bestResult?.attemptNumber || attempts.length,
    };
  }

  /**
   * Handle interactive HR / Behavioral / Communication / STAR / Summary queries
   * strictly grounded in stored interview evaluation evidence.
   */
  private static async handleHRInterviewChat(
    userMessage: string,
    interviewId: string,
    identityId: string,
    synthesis: SynthesizedReport
  ): Promise<ChatRouteResponse> {
    const qLower = userMessage.toLowerCase();

    // Fetch HR evaluation including summary and session responses
    const hrEval = await (prisma as any).hRInterviewEvaluation.findFirst({
      where: { hrSession: { interviewId } },
      include: {
        hrSession: {
          include: {
            questions: {
              include: { response: true },
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });

    const summary = (hrEval?.summary as any) || null;
    const officialScore = hrEval?.overallScore !== undefined ? Math.round(hrEval.overallScore) : (synthesis.scoreBreakdown?.hrScore || 0);

    // 1. Weakness query: "What was my biggest weakness?", "areas for improvement", etc.
    if (qLower.includes('weakness') || qLower.includes('biggest weakness') || qLower.includes('improve') || qLower.includes('areas for improvement')) {
      if (summary?.areasForImprovement && summary.areasForImprovement.length > 0) {
        const topWeaknesses = summary.areasForImprovement;
        let ans = `### 🎯 HR Interview: Key Areas for Improvement\n\n`;
        ans += `Based strictly on your recorded interview responses:\n\n`;
        topWeaknesses.forEach((w: any, idx: number) => {
          ans += `**${idx + 1}. ${w.title || w.area}** (${w.priority ? w.priority.toUpperCase() + ' PRIORITY' : 'RECOMMENDATION'})\n`;
          if (w.description) ans += `* **Observation**: ${w.description}\n`;
          if (w.evidence) ans += `* **Observed Evidence**: "${w.evidence}"\n`;
          if (w.impact) ans += `* **Impact**: ${w.impact}\n`;
          if (w.recommendation) ans += `* **Actionable Advice**: ${w.recommendation}\n\n`;
        });
        if (summary.recommendedPracticeFocus && summary.recommendedPracticeFocus.length > 0) {
          ans += `**Recommended Practice Focus**:\n`;
          summary.recommendedPracticeFocus.forEach((p: any) => {
            ans += `- **${p.focus}**: ${p.reason}\n`;
          });
        }
        return {
          answer: ans,
          suggestedFollowups: [
            'What did I do well?',
            `Why did I get ${officialScore}?`,
            'How was my communication?',
            'How was my STAR performance?',
          ],
        };
      } else if (hrEval?.improvements && hrEval.improvements.length > 0) {
        return {
          answer: `### 🎯 Areas for Improvement\n\n` +
            hrEval.improvements.map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n') +
            `\n\nFocus on providing structured examples with clear, measurable outcomes.`,
          suggestedFollowups: ['What did I do well?', `Why did I get ${officialScore}?`, 'How was my communication?'],
        };
      }
      return {
        answer: `No significant behavioral weaknesses were flagged in your responses. You maintained strong clarity and relevance throughout the interview.`,
        suggestedFollowups: ['What did I do well?', `Why did I get ${officialScore}?`],
      };
    }

    // 2. Strengths query: "What did I do well?", "strongest skill", "my strengths"
    if (qLower.includes('what did i do well') || qLower.includes('what i did well') || qLower.includes('strength') || qLower.includes('strongest')) {
      if (summary?.topStrengths && summary.topStrengths.length > 0) {
        let ans = `### 🌟 HR Interview: Top Demonstrated Strengths\n\n`;
        ans += `Here is the verified evidence of what you did well:\n\n`;
        summary.topStrengths.forEach((s: any, idx: number) => {
          ans += `**${idx + 1}. ${s.title || s.strength}**\n`;
          if (s.description) ans += `* **Assessment**: ${s.description}\n`;
          if (s.evidence) ans += `* **Observed Evidence**: "${s.evidence}"\n\n`;
        });
        if (summary.strongestDimensions && summary.strongestDimensions.length > 0) {
          ans += `**Highest Rated Dimensions**:\n`;
          summary.strongestDimensions.forEach((d: any) => {
            ans += `- **${d.dimension.toUpperCase()}**: ${typeof d.averageScore === 'number' ? d.averageScore.toFixed(1) : d.averageScore}/10\n`;
          });
        }
        return {
          answer: ans,
          suggestedFollowups: [
            'What was my biggest weakness?',
            `Why did I get ${officialScore}?`,
            'How was my communication?',
          ],
        };
      } else if (hrEval?.strengths && hrEval.strengths.length > 0) {
        return {
          answer: `### 🌟 Your Key Strengths\n\n` +
            hrEval.strengths.map((str: string, i: number) => `* **${str}**`).join('\n'),
          suggestedFollowups: ['What was my biggest weakness?', `Why did I get ${officialScore}?`],
        };
      }
      return {
        answer: `You completed your interview questions with relevant responses aligned to the target role.`,
        suggestedFollowups: ['What was my biggest weakness?', `Why did I get ${officialScore}?`],
      };
    }

    // 3. Score explanation query: "Why did I get 76?", "explain my score"
    if (/why did i get \d+/i.test(qLower) || /why (?:is|was) my (?:hr|score)/i.test(qLower) || /explain my (?:hr|score)/i.test(qLower) || qLower.includes('score')) {
      let ans = `### 📊 Official HR Score Explanation\n\n`;
      ans += `* **Official HR Score**: **${officialScore} / 100**\n`;
      ans += `* **Authority**: \`HRScoreEngine\` (Deterministic 8-Dimension Evaluation)\n`;
      if (summary?.overallAssessment?.category) {
        ans += `* **Performance Band**: **${summary.overallAssessment.category}**\n`;
      }
      ans += `\nYour score is calculated deterministically from verified responses across 8 behavioral dimensions:\n\n`;
      if (summary?.strongestDimensions && summary.strongestDimensions.length > 0) {
        ans += `* **Top Performing Dimensions**: ${summary.strongestDimensions.map((d: any) => `${d.dimension} (${d.averageScore}/10)`).join(', ')}\n`;
      }
      if (summary?.weakestDimensions && summary.weakestDimensions.length > 0) {
        ans += `* **Areas Pulling Down Score**: ${summary.weakestDimensions.map((d: any) => `${d.dimension} (${d.averageScore}/10)`).join(', ')}\n`;
      }
      if (summary?.overallAssessment?.summary) {
        ans += `\n**Evaluation Summary**:\n${summary.overallAssessment.summary}\n`;
      } else if (hrEval?.aiSummary) {
        ans += `\n${hrEval.aiSummary}\n`;
      }
      return {
        answer: ans,
        suggestedFollowups: [
          'What was my biggest weakness?',
          'What did I do well?',
          'How was my communication?',
          'How was my STAR performance?',
        ],
      };
    }

    // 4. Communication & Speech analysis query: "How was my communication?", "filler words", "speaking pace"
    if (qLower.includes('communication') || qLower.includes('filler') || qLower.includes('speech') || qLower.includes('pace') || qLower.includes('wpm')) {
      let ans = `### 🎙️ Communication & Speech Intelligence Analysis\n\n`;
      const commAssessment = summary?.communicationAssessment;
      if (commAssessment?.summary) {
        ans += `${commAssessment.summary}\n\n`;
      }
      const sp = hrEval?.speechSummary as any;
      if (sp) {
        ans += `**Verified Speech Metrics**:\n`;
        if (sp.averagePaceWpm) ans += `* **Speaking Pace**: ${Math.round(sp.averagePaceWpm)} WPM (${sp.averagePaceWpm < 110 ? 'Deliberate / Slow' : sp.averagePaceWpm > 170 ? 'Fast' : 'Optimal Coaching Band'})\n`;
        if (sp.totalFillerCount !== undefined) ans += `* **Filler Words Count**: ${sp.totalFillerCount} (${sp.averageFillerRatePerMin ? sp.averageFillerRatePerMin.toFixed(1) + '/min' : 'detected'})\n`;
        if (sp.totalRepetitionCount !== undefined) ans += `* **Repeated Phrases**: ${sp.totalRepetitionCount}\n`;
        if (sp.totalFalseStartCount !== undefined) ans += `* **False Starts**: ${sp.totalFalseStartCount}\n`;
        if (sp.totalConfidenceScore !== undefined) ans += `* **Language Confidence Score**: ${sp.totalConfidenceScore}/100\n`;
      }
      if (commAssessment?.improvements && commAssessment.improvements.length > 0) {
        ans += `\n**Coaching Recommendations**:\n`;
        commAssessment.improvements.forEach((imp: string) => {
          ans += `* ${imp}\n`;
        });
      }
      return {
        answer: ans,
        suggestedFollowups: [
          'What was my biggest weakness?',
          'What did I do well?',
          'How was my STAR performance?',
        ],
      };
    }

    // 5. STAR Performance query: "How was my STAR performance?", "STAR"
    if (qLower.includes('star')) {
      const star = summary?.starAssessment;
      let ans = `### ⭐ STAR Framework Performance\n\n`;
      if (star) {
        ans += `* **STAR-Applicable Responses**: ${star.applicableResponses}\n`;
        ans += `* **Complete STAR Answers**: ${star.completeResponses} / ${star.applicableResponses}\n`;
        if (star.missingResultResponses > 0) {
          ans += `* **Responses Missing Result**: ${star.missingResultResponses} (Action was described without a clear business outcome or measurable result)\n`;
        }
        if (star.summary) {
          ans += `\n**Analysis**:\n${star.summary}\n`;
        }
      } else {
        ans += `The STAR method evaluates behavioral questions across **Situation**, **Task**, **Action**, and **Result**.\n\n`;
        ans += hrEval?.starGuidance || `Make sure each behavioral story concludes with a tangible Result.`;
      }
      return {
        answer: ans,
        suggestedFollowups: [
          'What was my biggest weakness?',
          'What did I do well?',
          'How was my communication?',
        ],
      };
    }

    // 6. Default HR Executive Summary
    let defaultAns = `### 📋 HR Interview Executive Summary\n\n`;
    if (summary?.executiveSummary) {
      defaultAns += `${summary.executiveSummary}\n\n`;
    } else if (hrEval?.aiSummary) {
      defaultAns += `${hrEval.aiSummary}\n\n`;
    } else {
      defaultAns += `Interview evaluation completed with an official score of **${officialScore} / 100**.\n\n`;
    }
    defaultAns += `* **Official HR Score**: **${officialScore} / 100** (\`HRScoreEngine\`)\n`;
    if (summary?.overallAssessment?.category) {
      defaultAns += `* **Assessment Band**: ${summary.overallAssessment.category}\n`;
    }

    return {
      answer: defaultAns,
      suggestedFollowups: [
        'What was my biggest weakness?',
        'What did I do well?',
        'How was my communication?',
        'How was my STAR performance?',
      ],
    };
  }

  /**
   * Handle Phase 5: Interview Autopsy queries grounded in historical evidence
   */
  private static async handleAutopsyChat(userMessage: string, identityId: string): Promise<ChatRouteResponse> {
    try {
      const autopsy = await InterviewAutopsyService.getLatestAutopsy(identityId);
      if (autopsy.status === 'INSUFFICIENT_DATA' || autopsy.interviewsAnalyzed < 2) {
        return {
          answer: `🔬 **Interview Autopsy Status: Baseline Recording**\n\n` +
            `Interview Autopsy requires at least **2 completed mock assessments** to isolate recurring cross-interview failure patterns from single isolated mistakes.\n\n` +
            `Currently, **${autopsy.interviewsAnalyzed} completed session** is recorded. Complete another mock assessment to generate your multi-interview failure pattern autopsy.`,
          suggestedFollowups: [
            'What were my strengths in this session?',
            'How can I improve my coding score?',
            'What did I do well in HR?',
          ],
        };
      }

      const topFindings = autopsy.findings.slice(0, 3);
      if (topFindings.length === 0) {
        return {
          answer: `🔬 **Interview Autopsy Summary (${autopsy.interviewsAnalyzed} Assessments Analyzed)**\n\n` +
            `No acute recurring failure patterns were detected across your ${autopsy.interviewsAnalyzed} completed interviews! You have maintained consistent performance above benchmark thresholds.`,
          suggestedFollowups: [
            'What are my key strengths?',
            'How do I maintain my competitive edge?',
          ],
        };
      }

      let answer = `🔬 **Interview Autopsy: Top Recurring Weaknesses (${autopsy.interviewsAnalyzed} Assessments Analyzed)**\n\n`;
      topFindings.forEach((f, idx) => {
        answer += `### ${idx + 1}. ${f.title} (${f.severity} Priority — ${f.patternType.replace(/_/g, ' ')})\n`;
        answer += `* **Recurrence**: Observed across **${f.interviewsAffected} interviews** (${f.frequency} occurrences).\n`;
        answer += `* **Likely Root Cause**: ${f.likelyRootCause}\n`;
        answer += `* **Impact**: ${f.impact}\n`;
        answer += `* **Recommendation**: ${f.recommendation}\n\n`;
      });

      if (autopsy.crossRoundPatterns && autopsy.crossRoundPatterns.length > 0) {
        const cr = autopsy.crossRoundPatterns[0];
        answer += `### 🔄 Cross-Round Pattern: ${cr.title}\n`;
        answer += `* **Inference**: ${cr.inference}\n`;
        answer += `* **Recommendation**: ${cr.recommendation}\n\n`;
      }

      answer += `You can inspect exact failed test cases and verified transcripts in your **My Progress → Interview Autopsy** tab.`;

      return {
        answer,
        suggestedFollowups: [
          'How do I practice boundary test cases?',
          'Tell me more about STAR Result structure',
          'What are my demonstrated strengths?',
        ],
      };
    } catch (err: any) {
      return {
        answer: `🔬 **Interview Autopsy**: Unable to retrieve historical autopsy data at this moment (${err.message}).`,
        suggestedFollowups: ['Show my current report breakdown'],
      };
    }
  }
}


