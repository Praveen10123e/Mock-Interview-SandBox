import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart2, Star, TrendingUp, TrendingDown, MessageSquare,
  Clock, FileText, Info, Award, CheckCircle2, Loader2,
  Sparkles, AlertTriangle, Mic, Target, ArrowRight,
  Video, Play, Pause, Download, ExternalLink
} from 'lucide-react';
import { HRInterviewAPI, SCORING_DIMENSIONS } from '../../services/hrInterview.service';
import type { HRSession } from '../../services/hrInterview.service';
import api from '../../../../api/axios/instance';
import { getAccessToken } from '../../../../store/AuthStore';

interface HRReportTabProps {
  interviewId: string;
}

interface QuestionEvidenceCardProps {
  question: any;
  index: number;
  interviewId: string;
  onDownloadVideo: (mediaId: string, questionNumber: number, mimeType?: string) => void;
  isDownloading: boolean;
  getScoreColor: (score: number) => string;
}

const QuestionEvidenceCard: React.FC<QuestionEvidenceCardProps> = ({
  question: q,
  index,
  interviewId,
  onDownloadVideo,
  isDownloading,
  getScoreColor,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const answerMedia = q.response?.answerMedia;
  const isAvailable = Boolean(answerMedia?.available && answerMedia?.mediaId);
  const isExpired = answerMedia?.status === 'EXPIRED';

  const token = getAccessToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ? `${(import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '')}/api/v1`
    : '/api/v1';

  const streamUrl = isAvailable
    ? `${apiBase}/interviews/${interviewId}/media/${answerMedia.mediaId}/stream${tokenParam}`
    : '';

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => console.warn('Play interrupted:', err));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleOpenVideo = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header: Question N + Category + Score Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            Question {index + 1}
          </span>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            {q.category}
          </span>
          {q.questionType === 'FOLLOW_UP' && (
            <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold">
              Follow-up Prompt
            </span>
          )}
        </div>

        {q.response && typeof q.response.questionScore === 'number' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Score:</span>
            <span
              className="px-2.5 py-0.5 rounded font-mono text-xs font-bold border"
              style={{
                color: getScoreColor(q.response.questionScore),
                borderColor: `${getScoreColor(q.response.questionScore)}40`,
                backgroundColor: `${getScoreColor(q.response.questionScore)}10`,
              }}
            >
              {Math.round(q.response.questionScore)} / 100
            </span>
          </div>
        )}
      </div>

      {/* 1. HR Question */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          HR Question:
        </span>
        <p className="text-xs sm:text-sm font-semibold text-[#0F172A] leading-relaxed bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">
          "{q.question}"
        </p>
      </div>

      {/* 2. Student Answer */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Student Answer:
          </span>
          {q.response && (
            <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {q.response.durationSeconds}s
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {q.response.wordCount} words
              </span>
            </div>
          )}
        </div>
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
          <p className="text-xs text-[#0F172A] leading-relaxed font-sans">
            "{q.response?.verifiedTranscript || q.response?.rawTranscript || q.response?.transcript || 'No spoken answer recorded.'}"
          </p>
          {q.response?.rawTranscript && q.response?.verifiedTranscript && q.response.rawTranscript !== q.response.verifiedTranscript && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Acoustic STT Raw: </span>
              <span className="italic">"{q.response.rawTranscript}"</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. AI Evaluation */}
      {q.response ? (
        <div className="p-4 rounded-xl bg-slate-50/70 border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              AI Evaluation:
            </span>
          </div>

          {/* 8 Competencies Grid */}
          {q.response.dimensionScores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'relevance', label: 'Relevance' },
                { key: 'specificity', label: 'Specificity' },
                { key: 'evidence', label: 'Evidence' },
                { key: 'structure', label: 'Structure' },
                { key: 'clarity', label: 'Clarity' },
                { key: 'technicalDepth', label: 'Tech Depth' },
                { key: 'ownership', label: 'Ownership' },
                { key: 'professionalism', label: 'Professionalism' },
              ].map((dim) => {
                const val = (q.response?.dimensionScores as any)?.[dim.key] ?? 0;
                return (
                  <div key={dim.key} className="p-2 rounded-lg bg-white border border-slate-200/80 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">
                      {dim.label}
                    </div>
                    <div className="text-xs font-black font-mono mt-0.5" style={{ color: getScoreColor(val * 10) }}>
                      {val} <span className="text-[9px] text-slate-400 font-normal">/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Evaluator Justification */}
          {q.response.justification && (
            <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
              <strong className="text-slate-900">Feedback: </strong>
              {q.response.justification}
            </p>
          )}

          {/* STAR Framework Summary */}
          {q.response.starAnalysis?.starApplicable && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="font-semibold text-slate-700">STAR Analysis:</span>
              {['situation', 'task', 'action', 'result'].map((comp) => {
                const isPresent = q.response?.starAnalysis?.[comp]?.present;
                return (
                  <span
                    key={comp}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isPresent
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {comp.charAt(0).toUpperCase() + comp.slice(1)}: {isPresent ? 'Present' : 'Missing'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Evaluation unavailable for this question.</p>
      )}

      {/* 4. Video Evidence */}
      <div className="space-y-2.5 pt-1 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-indigo-600" />
            Video Evidence:
          </span>
          {isAvailable && (
            <span className="text-[10px] font-medium text-slate-500">
              Duration: {q.response?.durationSeconds || answerMedia.durationSeconds || 0}s • 1-hour privacy retention
            </span>
          )}
        </div>

        {isAvailable ? (
          <div className="space-y-3">
            {videoError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Unable to load video playback. Recording may have expired or is inaccessible.</span>
              </div>
            ) : (
              <div className="w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                <div className="aspect-video w-full flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    controls
                    preload="metadata"
                    src={streamUrl}
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => setVideoError(true)}
                  />
                </div>
              </div>
            )}

            {/* Actions: Play/Pause, Open Video, Download Video */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white text-xs font-semibold rounded-md hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Play / Pause
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenVideo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-800 border border-slate-300 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" /> Open Video
              </button>

              <button
                type="button"
                disabled={isDownloading}
                onClick={() => onDownloadVideo(answerMedia.mediaId, index + 1, answerMedia.mimeType)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-800 border border-slate-300 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                )}
                Download Video
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {isExpired
                  ? 'Answer Video Expired: This recording was automatically deleted after 1 hour.'
                  : 'Video evidence unavailable for this response.'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200/60 text-slate-600">
              {isExpired ? 'EXPIRED' : 'UNAVAILABLE'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const HRReportTab: React.FC<HRReportTabProps> = ({ interviewId }) => {
  const [session, setSession] = useState<HRSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(null);

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadVideo = async (mediaId: string, sequenceNumber: number, mimeType?: string) => {
    try {
      setDownloadingMediaId(mediaId);
      const response = await api.get(`/interviews/${interviewId}/media/${mediaId}/download`, {
        responseType: 'blob',
      });
      const contentType = String(response.headers['content-type'] || mimeType || 'video/webm');
      const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `question-${String(sequenceNumber).padStart(2, '0')}-video.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download answer video:', err);
      alert('Failed to download answer video. It may have expired or is unavailable.');
    } finally {
      setDownloadingMediaId(null);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const response = await api.get(`/interviews/${interviewId}/package/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Interview_Evidence_${interviewId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download interview package ZIP:', err);
      alert('Failed to download interview package ZIP. Please try again.');
    } finally {
      setDownloadingZip(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await HRInterviewAPI.getReport(interviewId);
        setSession(res.data || res);
      } catch (err: any) {
        setError('Failed to load HR report. The interview may still be processing.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-8 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] text-xs shadow-xs">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <p className="font-semibold">Loading HR behavioral report…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
        <Info className="w-5 h-5 text-rose-600 shrink-0" />
        <p className="font-medium">{error || 'No HR session data found.'}</p>
      </div>
    );
  }

  const evaluation = session.evaluation;
  const allQuestions = (session.questions || []).slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 65) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="space-y-6 text-[#0F172A]">
      {/* Overall Score Card */}
      {evaluation ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Score Ring */}
            <div className="relative w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center shrink-0 shadow-sm"
                 style={{ borderColor: getScoreColor(evaluation.overallScore) }}>
              <span className="text-3xl font-extrabold" style={{ color: getScoreColor(evaluation.overallScore) }}>
                {Math.round(evaluation.overallScore)}
              </span>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">/ 100</span>
            </div>

            {/* Score Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  Behavioral Interview Score
                </h2>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    color: getScoreColor(evaluation.overallScore),
                    borderColor: `${getScoreColor(evaluation.overallScore)}40`,
                    backgroundColor: `${getScoreColor(evaluation.overallScore)}10`,
                  }}
                >
                  {getScoreLabel(evaluation.overallScore)}
                </span>
              </div>
              {evaluation.aiSummary && (
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed mt-1">
                  {evaluation.aiSummary}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B] text-xs">
          <Info className="w-4 h-4 text-[#64748B]" />
          <p>
            {session.status === 'ANALYZING'
              ? 'Your responses are being evaluated. Please check back in a moment.'
              : session.status === 'IN_PROGRESS'
              ? 'The interview is still in progress.'
              : 'Evaluation not available yet.'}
          </p>
        </div>
      )}

      {/* 10-Dimension Score Breakdown */}
      {evaluation && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Performance Dimensions
            </h3>
            <span className="text-xs text-[#64748B]">Scored 0–100</span>
          </div>

          <div className="space-y-3.5">
            {SCORING_DIMENSIONS.map((dim) => {
              const score = (evaluation[dim.key as keyof typeof evaluation] as number) || 0;
              return (
                <div key={dim.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: dim.color }} />
                      <span className="font-semibold text-[#0F172A]">{dim.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {dim.weight > 0 && (
                        <span className="text-[11px] font-medium text-[#64748B]">
                          {dim.weight}%
                        </span>
                      )}
                      <span className="font-bold text-xs font-mono min-w-[28px] text-right" style={{ color: getScoreColor(score) }}>
                        {Math.round(score)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${dim.color}bb, ${dim.color})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      {evaluation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths Card */}
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Key Strengths
            </h3>
            <ul className="space-y-2 text-xs text-[#1E293B]">
              {(evaluation.strengths as string[]).map((s, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <Star className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements Card */}
          <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              Areas to Improve
            </h3>
            <ul className="space-y-2 text-xs text-[#1E293B]">
              {(evaluation.improvements as string[]).map((s, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* STAR Framework Guidance */}
      {evaluation?.starGuidance && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-xs shadow-2xs">
          <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-indigo-950 mb-1">STAR Framework Recommendations</h4>
            <p className="text-indigo-900 leading-relaxed">{evaluation.starGuidance}</p>
          </div>
        </div>
      )}

      {/* Communication Pattern Summary (Interview-level Speech Intelligence) */}
      {evaluation?.speechSummary && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600" />
                Communication Pattern Summary
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Coaching insights aggregated across all spoken responses. Diagnostic only — does not alter official HR scoring.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider self-start sm:self-auto">
              Communication Coaching Insights
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average Filler Rate</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-extrabold text-[#0F172A] font-mono">
                  {evaluation.speechSummary.averageFillerRate}%
                </span>
                <span className="text-[10px] text-slate-400">/ 100 words</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {evaluation.speechSummary.totalFillerWords} total filler words
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Speaking Pace</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-extrabold text-[#0F172A] font-mono">
                  {evaluation.speechSummary.averageWpm !== null ? Math.round(evaluation.speechSummary.averageWpm) : '—'}
                </span>
                <span className="text-[10px] text-slate-400">WPM</span>
              </div>
              <span className="text-[11px] font-medium text-slate-600 capitalize mt-0.5 block">
                {evaluation.speechSummary.paceClassification.replace('_', ' ')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Disfluencies</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-extrabold text-[#0F172A] font-mono">
                  {evaluation.speechSummary.totalRepetitions + evaluation.speechSummary.totalFalseStarts}
                </span>
                <span className="text-[10px] text-slate-400">events</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {evaluation.speechSummary.totalRepetitions} rep, {evaluation.speechSummary.totalFalseStarts} false starts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Language Markers</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-extrabold text-emerald-600 font-mono">
                  {evaluation.speechSummary.totalConfidenceMarkers}
                </span>
                <span className="text-[10px] text-slate-400">conf. /</span>
                <span className="text-lg font-extrabold text-amber-600 font-mono">
                  {evaluation.speechSummary.totalUncertaintyMarkers}
                </span>
                <span className="text-[10px] text-slate-400">uncert.</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Linguistic phrasing markers
              </span>
            </div>
          </div>

          {/* Top Filler Words Breakdown */}
          {Array.isArray(evaluation.speechSummary.topFillerWords) && evaluation.speechSummary.topFillerWords.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Observed Filler Expressions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.speechSummary.topFillerWords.map((item, fIdx) => (
                  <span
                    key={fIdx}
                    className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <span>"{item.word}"</span>
                    <span className="font-bold text-indigo-600">×{item.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Recommendations */}
          {Array.isArray(evaluation.speechSummary.coachingRecommendations) && evaluation.speechSummary.coachingRecommendations.length > 0 && (
            <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-2">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Actionable Communication Coaching:
              </span>
              <ul className="space-y-1.5 text-xs text-[#334155]">
                {evaluation.speechSummary.coachingRecommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PHASE 4: INTERVIEW SUMMARY
          ======================================================== */}
      {evaluation?.summary && (
        <div id="hr-interview-summary" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  INTERVIEW SUMMARY
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Evidence-grounded holistic evaluation synthesized from verified transcripts, 8-dimension behavioral scores, and speech pattern analysis.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {evaluation.summary.analysisVersion || 'hr-summary-v1'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {evaluation.summary.overallAssessment?.scoreSource || 'HRScoreEngine'}
              </span>
            </div>
          </div>

          {/* Executive Overview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border border-indigo-100/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Executive Overview</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {evaluation.summary.executiveSummary}
            </p>
          </div>

          {/* Overall Assessment Score Block */}
          {evaluation.summary.overallAssessment && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Overall Assessment
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-indigo-700 font-mono">
                    {evaluation.summary.overallAssessment.officialScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 100</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {evaluation.summary.overallAssessment.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {evaluation.summary.overallAssessment.summary}
                </p>
              </div>
              {evaluation.summary.readinessScore !== null && evaluation.summary.readinessScore !== undefined && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shrink-0 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Readiness Score</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">{evaluation.summary.readinessScore}%</span>
                </div>
              )}
            </div>
          )}

          {/* Top Strengths & Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Strengths */}
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Top Strengths</span>
              </div>
              <div className="space-y-3">
                {evaluation.summary.topStrengths?.map((s, idx) => (
                  <div key={idx} className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs space-y-1">
                    <div className="font-bold text-emerald-950 flex items-start gap-1.5">
                      <span className="text-emerald-600 font-mono">✓</span>
                      <span>{s.title || s.strength}</span>
                    </div>
                    {s.description && (
                      <p className="text-slate-600 pl-4">{s.description}</p>
                    )}
                    {s.evidence && (
                      <p className="text-[11px] text-slate-500 pl-4 italic border-l-2 border-emerald-300 ml-4 pl-2 mt-1">
                        "{s.evidence}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                <span>Areas for Improvement</span>
              </div>
              <div className="space-y-3">
                {evaluation.summary.areasForImprovement?.map((a, idx) => (
                  <div key={idx} className="bg-white/80 p-3 rounded-lg border border-amber-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{a.title || a.area}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        a.priority === 'high'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {a.priority}
                      </span>
                    </div>
                    {a.evidence && (
                      <p className="text-[11px] text-slate-500 italic pl-5">
                        Observed: "{a.evidence}"
                      </p>
                    )}
                    {a.impact && (
                      <p className="text-slate-600 pl-5">
                        <strong className="text-slate-700">Impact:</strong> {a.impact}
                      </p>
                    )}
                    {a.recommendation && (
                      <p className="text-slate-700 pl-5 font-medium bg-amber-50/50 p-1.5 rounded border border-amber-200/50">
                        <strong className="text-amber-900">Advice:</strong> {a.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Communication & STAR Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Communication Assessment */}
            {evaluation.summary.communicationAssessment && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>Communication</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {evaluation.summary.communicationAssessment.summary}
                </p>
                {evaluation.summary.communicationAssessment.improvements?.length > 0 && (
                  <ul className="space-y-1 pt-1 border-t border-slate-200 text-slate-700">
                    {evaluation.summary.communicationAssessment.improvements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* STAR Performance */}
            {evaluation.summary.starAssessment && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>STAR Performance</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {evaluation.summary.starAssessment.completeResponses} / {evaluation.summary.starAssessment.applicableResponses} Complete
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {evaluation.summary.starAssessment.summary}
                </p>
                {evaluation.summary.starAssessment.missingResultResponses > 0 && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                    ⚠️ {evaluation.summary.starAssessment.missingResultResponses} behavioral response(s) were missing a concrete, measurable Result component.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recommended Practice Focus */}
          {evaluation.summary.recommendedPracticeFocus && evaluation.summary.recommendedPracticeFocus.length > 0 && (
            <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs uppercase tracking-wider">
                <Target className="w-4 h-4 text-indigo-600" />
                <span>Recommended Practice Focus</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {evaluation.summary.recommendedPracticeFocus.map((p, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span>{p.focus}</span>
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {p.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] pl-6 leading-relaxed">
                      {p.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment Limitations */}
          {evaluation.summary.assessmentLimitations && evaluation.summary.assessmentLimitations.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700">Assessment Limitations:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                  {evaluation.summary.assessmentLimitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          QUESTION-WISE INTERVIEW EVIDENCE
          ======================================================== */}
      <div id="question-wise-evidence" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
        {/* Header with Title + Question Count Badge + Download All Evidence (.ZIP) button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-600" />
                QUESTION-WISE INTERVIEW EVIDENCE
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Individual question-level audio/video recordings mapped strictly to each interview prompt, candidate speech transcript, and AI evaluation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
              {allQuestions.length} Questions Recorded
            </span>

            <button
              type="button"
              disabled={downloadingZip}
              onClick={handleDownloadZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download All Evidence (.ZIP)
            </button>
          </div>
        </div>

        {/* Question Evidence Cards List */}
        <div className="space-y-6">
          {allQuestions.length > 0 ? (
            allQuestions.map((q, idx) => (
              <QuestionEvidenceCard
                key={q.id || idx}
                question={q}
                index={idx}
                interviewId={interviewId}
                onDownloadVideo={(mediaId, qNum, mime) => handleDownloadVideo(mediaId, qNum, mime)}
                isDownloading={downloadingMediaId === q.response?.answerMedia?.mediaId}
                getScoreColor={getScoreColor}
              />
            ))
          ) : (
            <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-lg border border-slate-200">
              No behavioral questions recorded for this session.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
