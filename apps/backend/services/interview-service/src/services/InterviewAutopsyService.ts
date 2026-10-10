/**
 * InterviewAutopsyService.ts
 *
 * Core service orchestrator for Phase 5 — Interview Autopsy Engine.
 * Manages evidence aggregation, recurrence detection, AI enhancement,
 * persistence, and staleness tracking.
 */

import { PrismaClient } from '../generated/client';
import { AutopsyEvidenceCollector } from './AutopsyEvidenceCollector';
import { AutopsyPatternDetector } from './AutopsyPatternDetector';
import { AutopsySummaryResult, AutopsyFinding } from './AutopsyTypes';
import crypto from 'crypto';
import axios from 'axios';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'GROQ').toUpperCase();
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export class InterviewAutopsyService {
  /**
   * Get latest persisted autopsy for candidate, with automatic staleness check
   */
  static async getLatestAutopsy(identityId: string): Promise<AutopsySummaryResult> {
    if (!identityId) {
      throw new Error('Candidate identityId is required.');
    }

    // 1. Check existing completed interviews count
    const completedCount = await (prisma as any).interview.count({
      where: {
        identityId,
        OR: [
          { state: 'COMPLETED' },
          { session: { finalizedAt: { not: null } } },
        ],
      },
    });

    if (completedCount === 0) {
      return {
        id: `autopsy-empty-${identityId}`,
        candidateId: identityId,
        generatedAt: new Date().toISOString(),
        analysisVersion: 'autopsy-v1',
        model: 'deterministic-rule-engine',
        promptVersion: 'v1.0',
        status: 'INSUFFICIENT_DATA',
        interviewsAnalyzed: 0,
        isStale: false,
        findings: [],
        strengths: [],
        resolvedPatterns: [],
        crossRoundPatterns: [],
        summary:
          'Complete your first mock interview assessment to generate your personalized Interview Autopsy.',
        kpis: {
          interviewsAnalyzed: 0,
          recurringWeaknessesCount: 0,
          highPriorityCount: 0,
          improvedAreasCount: 0,
        },
      };
    }

    // 2. Fetch latest persisted autopsy record from DB
    let latestDbRecord = await (prisma as any).interviewAutopsy.findFirst({
      where: { candidateId: identityId },
      orderBy: { generatedAt: 'desc' },
    });

    // 3. If no record exists, generate initial autopsy
    if (!latestDbRecord) {
      return await this.generateAutopsy(identityId);
    }

    // 4. Check Staleness: if candidate completed new interviews since last generation
    const isStale = completedCount > latestDbRecord.interviewsAnalyzed;
    const staleReason = isStale
      ? `${completedCount - latestDbRecord.interviewsAnalyzed} new completed interview(s) recorded since this analysis was generated.`
      : undefined;

    const findings = (latestDbRecord.findings as AutopsyFinding[]) || [];
    const strengths = (latestDbRecord.strengths as any[]) || [];
    const resolvedPatterns = (latestDbRecord.resolvedPatterns as any[]) || [];
    const crossRoundPatterns = (latestDbRecord.crossRoundPatterns as any[]) || [];

    const recurringWeaknessesCount = findings.filter(
      (f) => f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT'
    ).length;
    const highPriorityCount = findings.filter(
      (f) => f.severity === 'HIGH' || f.severity === 'CRITICAL'
    ).length;
    const improvedAreasCount = resolvedPatterns.length;

    return {
      id: latestDbRecord.id,
      candidateId: latestDbRecord.candidateId,
      generatedAt: latestDbRecord.generatedAt.toISOString(),
      analysisVersion: latestDbRecord.analysisVersion,
      model: latestDbRecord.model || 'deterministic-rule-engine',
      promptVersion: latestDbRecord.promptVersion || 'v1.0',
      status: latestDbRecord.status as 'COMPLETED' | 'INSUFFICIENT_DATA',
      interviewsAnalyzed: latestDbRecord.interviewsAnalyzed,
      isStale,
      staleReason,
      findings,
      strengths,
      resolvedPatterns,
      crossRoundPatterns,
      summary: latestDbRecord.summary,
      kpis: {
        interviewsAnalyzed: latestDbRecord.interviewsAnalyzed,
        recurringWeaknessesCount,
        highPriorityCount,
        improvedAreasCount,
      },
    };
  }

  /**
   * Explicitly generate and persist a fresh Interview Autopsy snapshot
   */
  static async generateAutopsy(identityId: string): Promise<AutopsySummaryResult> {
    if (!identityId) {
      throw new Error('Candidate identityId is required.');
    }

    // 1. Collect all authentic historical evidence
    const history = await AutopsyEvidenceCollector.collectCandidateHistory(identityId);
    const { interviews, totalCompletedCount } = history;

    if (totalCompletedCount === 0) {
      return {
        id: `autopsy-empty-${identityId}`,
        candidateId: identityId,
        generatedAt: new Date().toISOString(),
        analysisVersion: 'autopsy-v1',
        model: 'deterministic-rule-engine',
        promptVersion: 'v1.0',
        status: 'INSUFFICIENT_DATA',
        interviewsAnalyzed: 0,
        isStale: false,
        findings: [],
        strengths: [],
        resolvedPatterns: [],
        crossRoundPatterns: [],
        summary:
          'Complete your first mock interview assessment to generate your personalized Interview Autopsy.',
        kpis: {
          interviewsAnalyzed: 0,
          recurringWeaknessesCount: 0,
          highPriorityCount: 0,
          improvedAreasCount: 0,
        },
      };
    }

    // 2. Run pattern detection and recurrence classification
    const detection = AutopsyPatternDetector.detectPatterns(history);
    const { findings, strengths, resolvedPatterns, crossRoundPatterns } = detection;

    // 3. Compute evidence hash
    const evidenceIdsString = interviews.map((i) => `${i.id}-${i.finalizedAt}`).join('|');
    const evidenceHash = crypto.createHash('sha256').update(evidenceIdsString).digest('hex');

    // 4. Formulate Executive Summary
    let summary = '';
    let modelUsed = 'deterministic-rule-engine';

    if (totalCompletedCount === 1) {
      summary = `Baseline single-assessment autopsy recorded from ${interviews[0].title}. Evaluated across ${findings.length} observed focus area(s). Note: Multi-interview recurring pattern detection unlocks upon completion of a second assessment.`;
    } else {
      const recurringCount = findings.filter(
        (f) => f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT'
      ).length;
      const emergingCount = findings.filter((f) => f.patternType === 'EMERGING_PATTERN').length;

      summary = `Autopsy synthesized across ${totalCompletedCount} sequential completed assessments. Identified ${recurringCount} persistent failure pattern(s), ${emergingCount} emerging pattern(s), and ${resolvedPatterns.length} demonstrated improvement area(s). Recommendations are grounded strictly in recorded code executions, test failures, and verified interview transcripts.`;

      // Optional AI Summary Polish via Groq (strictly synthesizing recorded findings, NEVER fabricating data)
      if (LLM_API_KEY && findings.length > 0) {
        try {
          const aiSummary = await this.generateAISummary(findings, strengths, resolvedPatterns, totalCompletedCount);
          if (aiSummary && aiSummary.trim().length > 30) {
            summary = aiSummary.trim();
            modelUsed = GROQ_MODEL;
          }
        } catch (aiErr) {
          console.warn('[Autopsy] AI summary generation skipped, using deterministic summary:', aiErr);
        }
      }
    }

    // 5. Persist Autopsy Record in Database
    const savedRecord = await (prisma as any).interviewAutopsy.create({
      data: {
        candidateId: identityId,
        analysisVersion: 'autopsy-v1',
        model: modelUsed,
        promptVersion: 'v1.0',
        status: 'COMPLETED',
        interviewsAnalyzed: totalCompletedCount,
        evidenceHash,
        isStale: false,
        findings: findings as any,
        strengths: strengths as any,
        resolvedPatterns: resolvedPatterns as any,
        crossRoundPatterns: crossRoundPatterns as any,
        summary,
      },
    });

    const recurringWeaknessesCount = findings.filter(
      (f) => f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT'
    ).length;
    const highPriorityCount = findings.filter(
      (f) => f.severity === 'HIGH' || f.severity === 'CRITICAL'
    ).length;
    const improvedAreasCount = resolvedPatterns.length;

    return {
      id: savedRecord.id,
      candidateId: savedRecord.candidateId,
      generatedAt: savedRecord.generatedAt.toISOString(),
      analysisVersion: savedRecord.analysisVersion,
      model: savedRecord.model || 'deterministic-rule-engine',
      promptVersion: savedRecord.promptVersion || 'v1.0',
      status: 'COMPLETED',
      interviewsAnalyzed: savedRecord.interviewsAnalyzed,
      isStale: false,
      findings,
      strengths,
      resolvedPatterns,
      crossRoundPatterns,
      summary,
      kpis: {
        interviewsAnalyzed: totalCompletedCount,
        recurringWeaknessesCount,
        highPriorityCount,
        improvedAreasCount,
      },
    };
  }

  /**
   * List historical autopsy records for a candidate
   */
  static async getAutopsyHistory(identityId: string): Promise<any[]> {
    if (!identityId) return [];
    return await (prisma as any).interviewAutopsy.findMany({
      where: { candidateId: identityId },
      select: {
        id: true,
        generatedAt: true,
        interviewsAnalyzed: true,
        summary: true,
      },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Get specific historical autopsy record by ID
   */
  static async getAutopsyById(id: string, identityId: string): Promise<AutopsySummaryResult | null> {
    const record = await (prisma as any).interviewAutopsy.findFirst({
      where: { id, candidateId: identityId },
    });
    if (!record) return null;

    const findings = (record.findings as AutopsyFinding[]) || [];
    const strengths = (record.strengths as any[]) || [];
    const resolvedPatterns = (record.resolvedPatterns as any[]) || [];
    const crossRoundPatterns = (record.crossRoundPatterns as any[]) || [];

    const recurringWeaknessesCount = findings.filter(
      (f) => f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT'
    ).length;
    const highPriorityCount = findings.filter(
      (f) => f.severity === 'HIGH' || f.severity === 'CRITICAL'
    ).length;

    return {
      id: record.id,
      candidateId: record.candidateId,
      generatedAt: record.generatedAt.toISOString(),
      analysisVersion: record.analysisVersion,
      model: record.model || 'deterministic-rule-engine',
      promptVersion: record.promptVersion || 'v1.0',
      status: record.status as any,
      interviewsAnalyzed: record.interviewsAnalyzed,
      isStale: false,
      findings,
      strengths,
      resolvedPatterns,
      crossRoundPatterns,
      summary: record.summary,
      kpis: {
        interviewsAnalyzed: record.interviewsAnalyzed,
        recurringWeaknessesCount,
        highPriorityCount,
        improvedAreasCount: resolvedPatterns.length,
      },
    };
  }

  /**
   * Optional LLM summary synthesis (strictly faithful to evidence, zero fabrication)
   */
  private static async generateAISummary(
    findings: AutopsyFinding[],
    strengths: any[],
    resolved: any[],
    interviewsCount: number
  ): Promise<string | null> {
    if (!LLM_API_KEY) return null;

    const topFindings = findings.slice(0, 3).map((f) => ({
      title: f.title,
      severity: f.severity,
      patternType: f.patternType,
      interviewsAffected: f.interviewsAffected,
      likelyRootCause: f.likelyRootCause,
      impact: f.impact,
    }));

    const prompt = `You are the Interview Autopsy intelligence engine for Naan Mudhalvan Mock Interview Platform.
Write a professional, 2-3 sentence executive autopsy summary for a candidate evaluated across ${interviewsCount} completed interviews.

FINDINGS:
${JSON.stringify(topFindings, null, 2)}

STRENGTHS:
${JSON.stringify(strengths.map((s) => s.title), null, 2)}

RESOLVED WEAKNESSES:
${JSON.stringify(resolved.map((r) => r.title), null, 2)}

RULES:
1. Ground every statement in the recorded evidence. Do NOT invent new scores, fake test cases, or unmentioned skills.
2. Use cautious root cause phrasing ("Evidence suggests...", "Likely contributing factor...").
3. Mention top failure pattern and the primary corrective takeaway.
4. Keep length strictly to 2-3 sentences.`;

    const res = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    return res.data?.choices?.[0]?.message?.content || null;
  }
}
