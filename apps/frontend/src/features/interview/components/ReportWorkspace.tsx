import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { StatusBadge } from '../../../components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Code2, 
  Brain, 
  MessageSquare, 
  Target, 
  Award, 
  BookOpen, 
  ArrowRight,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Calculator,
  Info,
  Copy,
  Check,
  Download,
  Loader2,
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import api from '../../../api/axios/instance';
import { Button } from '../../../components/ui/button';
import { HRReportTab } from './hr/HRReportTab';
import { useAuthStore } from '../../../store/AuthStore';

const formatCategory = (cat: any): string => {
  if (!cat) return 'Quantitative';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object' && cat.name) return String(cat.name);
  return 'Quantitative';
};

const formatTopic = (top: any): string => {
  if (!top) return 'Aptitude';
  if (typeof top === 'string') return top;
  if (typeof top === 'object' && top.name) return String(top.name);
  return 'Aptitude';
};

interface ChatMessage {
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

/** Lightweight safe Markdown → HTML renderer (no external deps) */
function renderMarkdown(text: string): React.JSX.Element {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;

  const nextKey = () => `md-${keyIdx++}`;

  // Inline formatter: **bold**, `code`, *italic*
  const formatInline = (s: string): (string | React.ReactNode)[] => {
    const parts: (string | React.ReactNode)[] = [];
    // Split on bold (**...**), code (`...`), italic (*...*)  in order
    const regex = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
    let last = 0;
    let match;
    while ((match = regex.exec(s)) !== null) {
      if (match.index > last) parts.push(s.slice(last, match.index));
      if (match[1] !== undefined) {
        parts.push(<strong key={nextKey()} className="text-slate-900 font-bold">{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        parts.push(<code key={nextKey()} className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 border border-slate-200 font-mono text-[11px]">{match[2]}</code>);
      } else if (match[3] !== undefined) {
        parts.push(<em key={nextKey()} className="text-slate-600 italic">{match[3]}</em>);
      }
      last = regex.lastIndex;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // H3 ###
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={nextKey()} className="text-sm font-bold text-slate-900 mt-3 mb-1 leading-tight">
          {formatInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // H2 ##
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={nextKey()} className="text-base font-bold text-slate-900 mt-3 mb-1 leading-tight">
          {formatInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H1 #
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={nextKey()} className="text-lg font-bold text-slate-900 mt-3 mb-1 leading-tight">
          {formatInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Numbered list (1. 2. ...)
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={nextKey()} className="flex gap-2 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5 font-bold">
              {listItems.length + 1}
            </span>
            <span className="flex-1">{formatInline(content)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ol key={nextKey()} className="space-y-1.5 mt-1 mb-1">{listItems}</ol>);
      continue;
    }

    // Unordered list (• - *)
    if (/^[\-*•]\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[\-*•]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[\-*•]\s/, '');
        listItems.push(
          <li key={nextKey()} className="flex gap-2 items-start">
            <span className="text-blue-600 mt-0.5 shrink-0 font-bold">•</span>
            <span className="flex-1">{formatInline(content)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={nextKey()} className="space-y-1 mt-1 mb-1">{listItems}</ul>);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey()} className="border-slate-200 my-2" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={nextKey()} className="leading-relaxed">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">{elements}</div>;
}

export const ReportWorkspace = ({ sessionData, interviewId }: { sessionData?: any, interviewId: string }) => {
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(sessionData);
  const [loading, setLoading] = useState(!sessionData);
  const [error, setError] = useState('');
  const [showFormula, setShowFormula] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'aptitude' | 'coding' | 'hr' | 'chat'>('overview');
  const [selectedAptIndex, setSelectedAptIndex] = useState(0);
  const [aptViewMode, setAptViewMode] = useState<'single' | 'all'>('single');
  const [selectedCodingIndex, setSelectedCodingIndex] = useState(0);
  const [codingViewMode, setCodingViewMode] = useState<'single' | 'all'>('single');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [selectedAttempts, setSelectedAttempts] = useState<Record<number, number>>({});
  const [copiedCorrectedIdx, setCopiedCorrectedIdx] = useState<number | null>(null);
  const [copiedOptimizedIdx, setCopiedOptimizedIdx] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Download PDF Report
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const response = await api.get(`/interviews/${interviewId}/report/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Interview_Report_${interviewId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download PDF report:', err);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download ZIP Package
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
      a.download = `Interview_Report_${interviewId}.zip`;
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

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [askAiQuestion, setAskAiQuestion] = useState<any>(null);
  const [askAiCodingProblem, setAskAiCodingProblem] = useState<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false); // Prevent double-submit in StrictMode

  // 1. Fetch Report
  useEffect(() => {
    if (sessionData) {
      setReport(sessionData);
      setLoading(false);
      return;
    }
    if (report) return;
    
    setLoading(true);
    api.get(`/interviews/${interviewId}/report`)
      .then(res => {
        setReport(res.data);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load report');
      })
      .finally(() => setLoading(false));
  }, [interviewId, sessionData]);

  // 2. Fetch Chat History
  useEffect(() => {
    if (!interviewId) return;
    setChatLoading(true);
    api.get(`/interviews/${interviewId}/report/chat`)
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setMessages(res.data.data);
        }
      })
      .catch(err => {
        console.warn('Failed to load chat history:', err);
      })
      .finally(() => setChatLoading(false));
  }, [interviewId]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSendMessage = async (msgText?: string, displayText?: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim()) return;
    // Prevent double-submission (React StrictMode, double-click, etc.)
    if (sendingRef.current) return;
    sendingRef.current = true;

    // Build human-readable display label
    let displayContent = displayText || textToSend.trim();
    if (!displayText) {
      try {
        if (displayContent.startsWith('{') && displayContent.endsWith('}')) {
          const parsed = JSON.parse(displayContent);
          if (parsed.type === 'QUESTION_CONTEXT') {
            displayContent = `💬 Asking AI about Q${parsed.questionNumber}: ${parsed.question}`;
          } else if (parsed.type === 'TEACHING_MODE') {
            const modeLabels: Record<string, string> = {
              HINT: `💡 Give me a hint for Q${parsed.questionNumber}`,
              EXPLAIN: `📖 Explain the answer for Q${parsed.questionNumber}`,
              TEACH_ME: `🎓 Teach me from basics for Q${parsed.questionNumber}`,
              EXPLAIN_MISTAKE: `🧐 Explain my mistake in Q${parsed.questionNumber}`,
              SIMILAR_QUESTION: `🧠 Give me a similar practice question for Q${parsed.questionNumber}`,
            };
            displayContent = modeLabels[parsed.mode] || `Mode: ${parsed.mode} for Q${parsed.questionNumber}`;
          }
        }
      } catch {}
    }

    const userMsg: ChatMessage = {
      id: `local-usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await api.post(`/interviews/${interviewId}/report/chat`, {
        message: textToSend.trim(),
        displayContent,
      });

      if (res.data?.success && res.data.data) {
        const incoming: ChatMessage = res.data.data;
        // Guard: don't append if this message ID already exists (StrictMode double-invoke)
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue accessing your session evidence: ${err?.response?.data?.error || err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  // Launch Ask AI from a specific question card
  const handleAskAI = (q: any) => {
    if (sendingRef.current) return;
    setAskAiCodingProblem(null);
    setAskAiQuestion(q);
    setActiveTab('chat');
    const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
    const correctLabel = q.optionLabels?.[correctIdx] || String.fromCharCode(65 + correctIdx);
    const selectedIdx = q.selectedOptionIndex;
    const selectedLabel = selectedIdx !== null ? (q.optionLabels?.[selectedIdx] || String.fromCharCode(65 + selectedIdx)) : null;

    const payload = JSON.stringify({
      type: 'QUESTION_CONTEXT',
      questionId: q.questionId,
      questionNumber: q.questionNumber || 1,
      question: q.question || q.title,
      options: q.options,
      optionLabels: q.optionLabels,
      studentAnswer: selectedIdx !== null ? `${selectedLabel}) ${q.selectedOptionText}` : 'Not Attempted',
      correctAnswer: `${correctLabel}) ${q.correctOptionText}`,
      isCorrect: q.isCorrect,
      topic: typeof q.topic === 'string' ? q.topic : (q.topic?.name || 'Aptitude'),
      mistakeType: q.mistakeType || (selectedIdx === null ? 'Not Attempted' : 'Concept Misunderstanding'),
      conceptToRevise: q.conceptToRevise,
    });
    const displayText = `💬 Asking AI about Q${q.questionNumber || 1}: ${q.question || q.title}`;
    handleSendMessage(payload, displayText);
  };

  // Trigger teaching mode from pill
  const handleTeachingPill = (mode: string) => {
    if (!askAiQuestion || sendingRef.current) return;
    const payload = JSON.stringify({
      type: 'TEACHING_MODE',
      mode,
      questionId: askAiQuestion.questionId,
      questionNumber: askAiQuestion.questionNumber || 1,
    });
    const modeLabels: Record<string, string> = {
      HINT: `💡 Give me a hint for Q${askAiQuestion.questionNumber || 1}`,
      EXPLAIN: `📖 Explain the answer for Q${askAiQuestion.questionNumber || 1}`,
      TEACH_ME: `🎓 Teach me from basics for Q${askAiQuestion.questionNumber || 1}`,
      EXPLAIN_MISTAKE: `🧐 Explain my mistake in Q${askAiQuestion.questionNumber || 1}`,
      SIMILAR_QUESTION: `🧠 Give me a similar practice question for Q${askAiQuestion.questionNumber || 1}`,
    };
    handleSendMessage(payload, modeLabels[mode]);
  };

  // Launch Ask AI from a specific coding problem
  const handleAskAICoding = (p: any, probNumber: number) => {
    if (sendingRef.current) return;
    setAskAiQuestion(null);
    setAskAiCodingProblem({ ...p, problemNumber: probNumber });
    setActiveTab('chat');

    const payload = JSON.stringify({
      type: 'CODING_CONTEXT',
      questionId: p.questionId,
      problemNumber: probNumber,
      title: p.title,
      pattern: p.pattern,
      difficulty: p.difficulty,
      finalVerdict: p.finalVerdict,
      testsPassed: p.testsPassed,
      testsTotal: p.testsTotal,
      candidateComplexity: p.candidateTimeComplexity,
      expectedComplexity: p.expectedComplexity,
    });
    const displayText = `💻 Asking AI about Coding Problem #${probNumber}: ${p.title}`;
    handleSendMessage(payload, displayText);
  };

  // Launch Ask AI for a specific attempt of a coding problem
  const handleAskAIAttempt = (p: any, probNumber: number, attemptNumber: number) => {
    if (sendingRef.current) return;
    setAskAiQuestion(null);
    setAskAiCodingProblem({ ...p, problemNumber: probNumber, selectedAttemptNumber: attemptNumber });
    setActiveTab('chat');

    const payload = JSON.stringify({
      type: 'CODING_CONTEXT',
      questionId: p.questionId,
      problemNumber: probNumber,
      attemptNumber,
      title: p.title,
    });
    const displayText = `💻 Asking AI about Attempt #${attemptNumber} for Problem #${probNumber}: ${p.title}`;
    handleSendMessage(payload, displayText);
  };

  // Trigger coding mode pill from chat
  const handleCodingPill = (mode: string) => {
    if (!askAiCodingProblem || sendingRef.current) return;
    const probNumber = askAiCodingProblem.problemNumber || 1;
    const payload = JSON.stringify({
      type: 'CODING_MODE',
      mode,
      problemNumber: probNumber,
      questionId: askAiCodingProblem.questionId,
      candidateComplexity: askAiCodingProblem.candidateTimeComplexity || askAiCodingProblem.candidateComplexity,
    });
    const modeLabels: Record<string, string> = {
      WHAT_IS_WRONG: `🧐 What exactly is wrong in my code for Problem #${probNumber}?`,
      WHICH_TEST_FAILED: `❌ Which test case failed for Problem #${probNumber}?`,
      COMPLEXITY: `⚡ Why is my solution ${askAiCodingProblem.candidateTimeComplexity || 'suboptimal'} for Problem #${probNumber}?`,
      CORRECT_APPROACH: `💡 Show me the optimal approach for Problem #${probNumber}`,
      TEACH_PATTERN: `🎓 Teach me the algorithmic pattern for Problem #${probNumber}`,
    };
    handleSendMessage(payload, modeLabels[mode] || `Problem #${probNumber} Query`);
  };

  // Answer practice question
  const handleAnswerPractice = async (practiceQuestionId: string, answerLetter: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: ChatMessage = {
      id: `local-usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: `Selected Option ${answerLetter}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await api.post(`/interviews/${interviewId}/report/chat/practice/${practiceQuestionId}/answer`, {
        answer: answerLetter,
      });
      if (res.data?.success && res.data.data) {
        const incoming: ChatMessage = res.data.data;
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to validate answer: ${err?.response?.data?.error || err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-xs text-slate-500 font-mono">Aggregating session evidence & computing 7-dimension metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Error Loading Report</h2>
            <p className="text-xs text-slate-500 mt-1">{error || 'Interview not found or could not be loaded.'}</p>
          </div>
          <Button onClick={() => navigate('/student/interviews')} size="sm">
            Back to Interviews Hub
          </Button>
        </div>
      </div>
    );
  }

  // ── Normalize Data from Report Snapshot ──────────────────────────────────────
  const overallProficiencyScore =
    report.overallProficiencyScore ??
    report.overallScore ??
    report.scores?.normalizedCompositeScore ??
    0;

  const rawDuration = report.sessionDuration || '';
  const parsedMins = parseInt(rawDuration, 10);
  const sessionDuration = (!rawDuration || isNaN(parsedMins) || parsedMins > 300 || parsedMins <= 0)
    ? '60 min'
    : (rawDuration.includes('min') || rawDuration.includes('hr') ? rawDuration : `${parsedMins} min`);
  const assessmentDate = report.assessmentDate || report.finalizedAt;
  const percentileBenchmark =
    report.percentileBenchmark || 'Benchmark unavailable — more completed assessments are required.';

  const summary = report.summary || {
    aptitudePassed: report.stages?.aptitude?.correctCount ?? 0,
    aptitudeTotal: report.stages?.aptitude?.totalQuestions ?? 5,
    aptitudeScore: report.stages?.aptitude?.scorePercentage ?? 0,
    codingAccepted:
      report.stages?.coding?.problems?.filter(
        (p: any) => p.finalStatus === 'ACCEPTED' || p.finalStatus === 'PASSED'
      ).length ?? 0,
    codingTotal: report.stages?.coding?.totalProblems ?? 2,
    codingScore: report.stages?.coding?.scorePercentage ?? 0,
    testsPassed: report.stages?.coding?.totalTestsPassed ?? 0,
    totalTests: report.stages?.coding?.totalTestsCount ?? 0,
    totalCodingAttempts:
      (report.stages?.coding?.totalRunAttempts || 0) +
      (report.stages?.coding?.totalSubmitAttempts || 0),
    hrStatus: report.stages?.hr?.status || 'NOT_ATTEMPTED',
  };

  const rawMetrics = report.metrics || {};
  const metrics =
    Object.keys(rawMetrics).length > 0
      ? rawMetrics
      : {
          correctness: {
            name: 'Correctness & Edge-Case Handling',
            weight: '20%',
            score: summary.codingScore || 0,
            explanation: `Evaluated pass rate across all test cases (${summary.testsPassed}/${summary.totalTests} passed).`,
          },
          complexity: {
            name: 'Time & Space Complexity',
            weight: '18%',
            score: summary.codingScore > 0 ? 85 : 50,
            explanation: 'Algorithmic complexity measured against expected bounds.',
          },
          codeQuality: {
            name: 'Code Quality & Readability',
            weight: '15%',
            score: summary.codingScore > 0 ? 80 : 50,
            explanation: 'Syntactic structure, maintainability, and clean naming.',
          },
          debugging: {
            name: 'Debugging Efficiency',
            weight: '15%',
            score: summary.totalCodingAttempts > 0 ? 75 : 50,
            explanation: `${summary.totalCodingAttempts} execution runs recorded across assigned problems.`,
          },
          communication: {
            name: 'Communication Clarity',
            weight: '15%',
            score: summary.hrStatus === 'COMPLETED' ? 85 : 50,
            explanation: 'Structure, confidence, and articulation in behavioral round.',
          },
          problemSolving: {
            name: 'Problem-Solving Approach',
            weight: '10%',
            score: summary.aptitudeScore || 0,
            explanation: `Aptitude reasoning score: ${summary.aptitudePassed}/${summary.aptitudeTotal} correct (${summary.aptitudeScore}%).`,
          },
          stressResilience: {
            name: 'Stress Resilience',
            weight: '7%',
            score: 80,
            explanation: 'Pacing and composure across all interview rounds.',
          },
        };

  // Build 7-Axis Radar Chart Data
  const radarData = [
    { subject: 'Correctness', A: metrics.correctness?.score ?? 0, fullMark: 100 },
    { subject: 'Complexity', A: metrics.complexity?.score ?? 0, fullMark: 100 },
    { subject: 'Code Quality', A: metrics.codeQuality?.score ?? 0, fullMark: 100 },
    { subject: 'Debugging', A: metrics.debugging?.score ?? 0, fullMark: 100 },
    { subject: 'Communication', A: metrics.communication?.score ?? 0, fullMark: 100 },
    { subject: 'Problem Solving', A: metrics.problemSolving?.score ?? 0, fullMark: 100 },
    { subject: 'Resilience', A: metrics.stressResilience?.score ?? 0, fullMark: 100 },
  ];

  const scoreBreakdown = report.scoreBreakdown || {
    formula: `Overall (${overallProficiencyScore}/100) = Aptitude (${summary.aptitudeScore}% × 40%) + Coding (${summary.codingScore}% × 40%) + HR (${report.scoreBreakdown?.hrScore ?? 0}% × 20%)`,
    aptitudeScore: summary.aptitudeScore,
    aptitudeWeight: '40%',
    codingScore: summary.codingScore,
    codingWeight: '40%',
    hrScore: report.scoreBreakdown?.hrScore ?? 0,
    hrWeight: '20%',
  };

  const aptitudeAnalysis = report.aptitudeAnalysis || report.stages?.aptitude?.questions || [];
  const codingAnalysis = report.codingAnalysis || report.codingBreakdown || report.stages?.coding?.problems || [];
  const hrTranscript = report.stages?.hr?.conversationLog || report.hrTranscript || [];
  const hrAnalysis = report.hrAnalysis || report.stages?.hr?.analysis || {};

  const strengths =
    report.strengths && report.strengths.length > 0
      ? report.strengths
      : [
          `Completed assessment session across ${
            (summary.aptitudeTotal || 5) + (summary.codingTotal || 2) + 1
          } assigned question items.`,
        ];

  const areasToImprove =
    report.areasToImprove && report.areasToImprove.length > 0
      ? report.areasToImprove
      : [
          'Continue practicing advanced edge cases and competitive time-limit challenges.',
        ];

  const skillGapMap = report.skillGapMap || [];
  const nextActionPlan =
    report.nextActionPlan && report.nextActionPlan.length > 0
      ? report.nextActionPlan
      : [
          'Practice problem solving on Naan Mudhalvan Sandbox modules.',
          'Review optimal time complexity patterns.',
        ];

  const rawMonitoring = report.monitoring;
  const monitoringEvents = rawMonitoring?.events || [];
  const monitoringTotalSwitches = typeof rawMonitoring?.totalSwitches === 'number'
    ? rawMonitoring.totalSwitches
    : typeof rawMonitoring?.tabSwitches === 'number'
    ? rawMonitoring.tabSwitches
    : monitoringEvents.length;
  const monitoringTotalAwaySeconds = typeof rawMonitoring?.totalAwaySeconds === 'number'
    ? rawMonitoring.totalAwaySeconds
    : typeof rawMonitoring?.totalTimeAwaySeconds === 'number'
    ? rawMonitoring.totalTimeAwaySeconds
    : monitoringEvents.reduce((sum: number, ev: any) => sum + (ev.durationSeconds || 0), 0);
  const monitoringStatus = rawMonitoring?.status || rawMonitoring?.monitoringStatus || (
    monitoringTotalSwitches > 2 || monitoringTotalAwaySeconds > 30 ? 'Review Recommended' : 'Integrity Verified'
  );

  const monitoring = {
    status: monitoringStatus,
    totalSwitches: monitoringTotalSwitches,
    totalAwaySeconds: monitoringTotalAwaySeconds,
    tabSwitches: monitoringTotalSwitches,
    totalTimeAwaySeconds: monitoringTotalAwaySeconds,
    events: monitoringEvents,
    explanation: rawMonitoring?.explanation || (
      monitoringTotalSwitches === 0 ? 'Assessment completed with continuous focus.' : `${monitoringTotalSwitches} focus change events recorded.`
    ),
  };
  const completionReason =
    report.completionDetails?.completionReason ||
    report.completionReason ||
    'Manually Submitted';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* ── SUB-HEADER NAVIGATION BAR ── */}
      <div className="h-13 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#111827] text-white border border-[#111827] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📊 Executive Overview
          </button>
          <button
            onClick={() => setActiveTab('aptitude')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'aptitude'
                ? 'bg-[#111827] text-white border border-[#111827] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🧠 Aptitude Review ({summary.aptitudePassed}/{summary.aptitudeTotal})
          </button>
          <button
            onClick={() => setActiveTab('coding')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'coding'
                ? 'bg-[#111827] text-white border border-[#111827] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            💻 Coding Deep-Dive ({summary.codingAccepted}/{summary.codingTotal} Solved)
          </button>
          <button
            onClick={() => setActiveTab('hr')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'hr'
                ? 'bg-[#111827] text-white border border-[#111827] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            💬 HR Behavioral Review
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#7C3AED] text-white border border-[#7C3AED] shadow-xs'
                : 'text-purple-700 bg-purple-50/70 border border-purple-200 hover:bg-purple-100/70'
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-current" />
            Ask About My Interview
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black border border-black text-xs font-semibold hover:bg-neutral-100 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Download complete PDF evaluation report"
          >
            {downloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloadingPdf ? 'Generating PDF...' : 'Download Report'}
          </button>

          <button
            type="button"
            disabled={downloadingZip}
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Download ZIP package containing PDF report and all available question answer videos"
          >
            {downloadingZip ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloadingZip ? 'Creating ZIP...' : 'Download Interview Package'}
          </button>

          <Button
            onClick={() => {
              const role = useAuthStore.getState().user?.roles?.[0];
              if (role === 'FACULTY') {
                navigate('/faculty/reports');
              } else {
                navigate('/student/interviews');
              }
            }}
            variant="secondary"
            size="sm"
          >
            Exit to Hub
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <>
              {/* ── SECTION 1 — HEADER & SCORE HERO ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-2xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Evidence-Based Candidate Evaluation</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                      FINAL ASSESSMENT REPORT
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> Duration: {sessionDuration}
                      </span>
                      <span>•</span>
                      <span>
                        Date: {assessmentDate ? new Date(assessmentDate).toLocaleDateString() : 'Today'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold font-sans">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Evaluated from Session Evidence
                      </span>
                    </div>
                    <div className="pt-2 text-xs text-slate-600 font-mono flex items-center gap-2">
                      <span>Cohort Benchmark:</span>
                      <span className="text-slate-900 font-bold">{percentileBenchmark}</span>
                    </div>
                  </div>

                  {/* Hero Proficiency Score Card */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 min-w-[240px] text-center shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Overall Proficiency
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl md:text-6xl font-black tracking-tight text-slate-900">
                        {overallProficiencyScore}
                      </span>
                      <span className="text-base text-slate-400 font-bold">/ 100</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 mt-1">
                      {overallProficiencyScore >= 80 ? 'Proficient Ready' : overallProficiencyScore >= 60 ? 'Developing Competence' : 'Targeted Practice Required'}
                    </span>
                    
                    <button
                      onClick={() => setShowFormula(f => !f)}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
                    >
                      <Calculator className="h-3 w-3" />
                      {showFormula ? 'Hide Calculation' : 'View Transparent Formula'}
                      {showFormula ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Transparent Formula Box */}
                {showFormula && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-blue-200 text-xs space-y-2 animate-in fade-in duration-200 font-mono">
                    <div className="text-blue-700 font-bold flex items-center gap-2 font-sans">
                      <Info className="h-4 w-4" /> Transparent Weighted Scoring Model:
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800">
                      {scoreBreakdown.formula}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <span className="text-slate-500">Aptitude:</span> <strong className="text-blue-700">{scoreBreakdown.aptitudeScore}%</strong> × 40%
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <span className="text-slate-500">Coding:</span> <strong className="text-emerald-700">{scoreBreakdown.codingScore}%</strong> × 40%
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <span className="text-slate-500">HR:</span> <strong className="text-purple-700">{scoreBreakdown.hrScore}%</strong> × 20%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 2 — 6 SUMMARY METRIC CARDS ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-blue-600" /> Aptitude
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {summary.aptitudePassed} <span className="text-xs text-slate-400">/ {summary.aptitudeTotal}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{summary.aptitudeScore}% correct</div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-emerald-600" /> Coding Accepted
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {summary.codingAccepted} <span className="text-xs text-slate-400">/ {summary.codingTotal}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{summary.codingScore} pts earned</div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-600" /> Tests Passed
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {summary.testsPassed} <span className="text-xs text-slate-400">/ {summary.totalTests}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Across all problems</div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" /> Executions
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {summary.totalCodingAttempts}
                  </div>
                  <div className="text-[11px] text-slate-500">Runs + Submissions</div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-600" /> HR Interview
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    <StatusBadge status={summary.hrStatus || 'NOT_ATTEMPTED'} />
                  </div>
                  <div className="text-[11px] text-slate-500">Behavioral round</div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-rose-600" /> Duration
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {sessionDuration}
                  </div>
                  <div className="text-[11px] text-slate-500">Total session time</div>
                </Card>
              </div>

              {/* ── ASSESSMENT INTEGRITY & MONITORING ── */}
              <Card className="p-6 bg-white border border-slate-200 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      monitoring?.status === 'Review Recommended'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          Assessment Integrity & Monitoring
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          Monitoring Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Integrity monitoring tracks window focus to ensure a fair assessment environment. Tab switches do not penalize test scores.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      monitoring?.status === 'Review Recommended'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        monitoring?.status === 'Review Recommended' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {monitoring?.status || 'Integrity Verified'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                      completionReason?.includes('Expired')
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      {completionReason}
                    </span>
                  </div>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Integrity Status</span>
                    <span className={`text-sm font-bold ${
                      monitoring?.status === 'Review Recommended' ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {monitoring?.status || 'Integrity Verified'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Tab Switches Detected</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {monitoringTotalSwitches}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Total Time Outside</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {monitoringTotalAwaySeconds}s
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Submission Reason</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block" title={completionReason}>
                      {completionReason}
                    </span>
                  </div>
                </div>

                {/* Timeline of events */}
                {monitoring?.events && monitoring.events.length > 0 ? (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Chronological Window Visibility Events ({monitoring.events.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {monitoring.events.map((evt: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-mono text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <div className="text-slate-700">
                              <span>
                                Left Assessment: <strong className="text-slate-900 font-mono font-bold">{evt.leftAt ? new Date(evt.leftAt).toLocaleTimeString() : 'Unknown'}</strong>
                              </span>
                              <span className="mx-2 text-slate-400">→</span>
                              <span>
                                Returned: <strong className="text-slate-900 font-mono font-bold">{evt.returnedAt ? new Date(evt.returnedAt).toLocaleTimeString() : 'Session Finished'}</strong>
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold text-[11px]">
                            {evt.durationSeconds ?? 0}s away
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Integrity monitoring detected no visibility changes. Assessment was completed in continuous focus.</span>
                  </div>
                )}
              </Card>

              {/* ── SECTION 3 — 7-DIMENSION RADAR & EVIDENCE BREAKDOWN ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Radar Chart Card */}
                <Card className="p-6 bg-white border border-slate-200 shadow-2xs lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" /> 7-Axis Competency Profile
                    </h3>
                    <p className="text-xs text-slate-500">Multidimensional capability breakdown across technical and behavioral rounds</p>
                  </div>
                  <div className="h-[280px] w-full my-4 min-h-[280px] overflow-hidden">
                    <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Proficiency" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[11px] text-center text-slate-400 italic border-t border-slate-100 pt-3">
                    Scores synthesized from stored execution records, test pass ratios, and HR transcripts.
                  </div>
                </Card>

                {/* 7-Dimension Explanations */}
                <Card className="p-6 bg-white border border-slate-200 shadow-2xs lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" /> Dimension Scores & Evidence ("Why this score?")
                  </h3>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                    {Object.entries(metrics).map(([key, metric]: [string, any]) => (
                      <div key={key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-slate-300 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{metric.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                              Weight: {metric.weight}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {metric.score} / 100
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                          {metric.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* ── SECTION 4 — DEMONSTRATED STRENGTHS & IMPROVEMENTS ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="p-5 bg-white border border-emerald-200 shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" /> Demonstrated Strengths
                  </h3>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {strengths.map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 bg-white border border-amber-200 shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" /> Targeted Areas to Improve
                  </h3>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {areasToImprove.map((a: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* ── SECTION 5 — NAAN MUDHALVAN SKILL GAP MAP ── */}
              {skillGapMap.length > 0 && (
                <Card className="p-6 bg-white border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" /> Naan Mudhalvan Skill Gap & Curriculum Map
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50">
                          <th className="py-2.5 px-4 font-semibold">Identified Skill Gap</th>
                          <th className="py-2.5 px-4 font-semibold">Assessment Evidence</th>
                          <th className="py-2.5 px-4 font-semibold">Recommended NM Module</th>
                          <th className="py-2.5 px-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {skillGapMap.map((gap: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">{gap.weakSkill}</td>
                            <td className="py-3 px-4 text-slate-600">{gap.evidence}</td>
                            <td className="py-3 px-4 font-medium text-blue-600">{gap.recommendedNMModule}</td>
                            <td className="py-3 px-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] h-7 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg"
                                onClick={() => navigate('/student/interviews')}
                              >
                                Practice Module <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* ── SECTION 6 — NEXT ACTION PLAN ── */}
              <Card className="p-6 bg-white border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" /> Next Action Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nextActionPlan.map((action: string, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-xs text-slate-700 leading-relaxed font-sans">{action}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: APTITUDE REVIEW WITH MISTAKE DIAGNOSTICS */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: APTITUDE REVIEW WITH EVIDENCE-BASED LEARNING INTERFACE        */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'aptitude' && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" /> Aptitude Stage Review
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evidence-based learning review: original options, visual mistake diagnostics, and step-by-step solutions.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex rounded-xl bg-slate-100 border border-slate-200 p-0.5 text-[11px]">
                    <button
                      onClick={() => setAptViewMode('single')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        aptViewMode === 'single' ? 'bg-[#111827] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Question by Question
                    </button>
                    <button
                      onClick={() => setAptViewMode('all')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        aptViewMode === 'all' ? 'bg-[#111827] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      View All ({aptitudeAnalysis.length})
                    </button>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-mono font-bold text-blue-700">
                    {summary.aptitudePassed} / {summary.aptitudeTotal} Correct ({summary.aptitudeScore}%)
                  </div>
                </div>
              </div>

              {/* Navigation Bar (Shown in single question mode) */}
              {aptViewMode === 'single' && aptitudeAnalysis.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedAptIndex <= 0}
                    onClick={() => setSelectedAptIndex(prev => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous Question
                  </Button>

                  {/* Question Selector Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {aptitudeAnalysis.map((q: any, idx: number) => {
                      const isCur = idx === selectedAptIndex;
                      const isCor = q.isCorrect;
                      const isUnattempted = q.selectedOptionIndex === null;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedAptIndex(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isCur
                              ? 'bg-[#111827] border border-[#111827] text-white shadow-xs'
                              : isCor
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : isUnattempted
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span>Q{idx + 1}</span>
                          <span className="text-[10px]">
                            {isCor ? '✓' : isUnattempted ? '⏳' : '✗'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">
                      Question {selectedAptIndex + 1} of {aptitudeAnalysis.length}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={selectedAptIndex >= aptitudeAnalysis.length - 1}
                      onClick={() => setSelectedAptIndex(prev => Math.min(aptitudeAnalysis.length - 1, prev + 1))}
                    >
                      Next Question <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Question Card Renderer Helper */}
              {(() => {
                const renderQuestionCard = (q: any, idx: number) => {
                  const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
                  const correctLabel = q.optionLabels?.[correctIdx] || String.fromCharCode(65 + correctIdx);
                  const selectedIdx = q.selectedOptionIndex;
                  const selectedLabel = selectedIdx !== null ? (q.optionLabels?.[selectedIdx] || String.fromCharCode(65 + selectedIdx)) : null;
                  const isNotAttempted = selectedIdx === null;
                  const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];

                  return (
                    <Card
                      key={q.questionId || idx}
                      className={`p-6 bg-white border rounded-2xl shadow-2xs transition-all space-y-6 ${
                        q.isCorrect
                          ? 'border-emerald-200'
                          : isNotAttempted
                          ? 'border-amber-200'
                          : 'border-rose-200'
                      }`}
                    >
                      {/* Card Header: Q1 | Topic | Difficulty | Status */}
                      <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            Q{q.questionNumber || idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {formatCategory(q.category)} – {formatTopic(q.topic)}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                            [{(q.difficulty || 'Medium').toUpperCase()}]
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 ${
                            q.isCorrect
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isNotAttempted
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {q.isCorrect ? '✓ Correct' : isNotAttempted ? '⏳ Not Attempted' : '✗ Incorrect'}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                          Question
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-relaxed font-sans">
                          {q.question || q.title}
                        </h3>
                      </div>

                      {/* OPTIONS LIST WITH VISUAL HIGHLIGHTING */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                          <span>OPTIONS</span>
                          <span className="text-[10px] font-normal text-slate-400 lowercase">4 choices</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {options.map((opt: string, optIdx: number) => {
                            const isSelected = selectedIdx === optIdx;
                            const isCorrectOption = correctIdx === optIdx;
                            const optLetter = q.optionLabels?.[optIdx] || String.fromCharCode(65 + optIdx);

                            let rowStyle = 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50';
                            let circleStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                            let badgeText = null;

                            if (isCorrectOption) {
                              rowStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-500/20';
                              circleStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                              badgeText = isSelected ? 'Your Answer ✓ Correct' : '✓ Correct Answer';
                            } else if (isSelected && !q.isCorrect) {
                              rowStyle = 'border-rose-500 bg-rose-50/70 text-rose-950 font-bold shadow-2xs ring-1 ring-rose-500/20';
                              circleStyle = 'bg-rose-600 text-white border-rose-600 font-bold';
                              badgeText = '✗ Your Selected Answer';
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${rowStyle}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] shrink-0 border ${circleStyle}`}>
                                    {optLetter}
                                  </span>
                                  <span className="leading-snug break-words">{opt}</span>
                                </div>

                                {badgeText && (
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 ${
                                    isCorrectOption
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ANSWER SUMMARY BANNER */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-semibold">Your Answer:</span>
                          {isNotAttempted ? (
                            <span className="text-amber-800 font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                              Not Attempted
                            </span>
                          ) : (
                            <span className={`font-bold px-2 py-0.5 rounded ${
                              q.isCorrect
                                ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                                : 'text-rose-800 bg-rose-50 border border-rose-200'
                            }`}>
                              {selectedLabel}) {q.selectedOptionText || options[selectedIdx]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-semibold">Correct Answer:</span>
                          <span className="text-emerald-800 font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                            {correctLabel}) {q.correctOptionText || options[correctIdx]}
                          </span>
                        </div>
                      </div>

                      {/* AI EXPLANATION & SOLUTION (4-STEP REAL RESOLUTION) */}
                      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-wide">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span>AI Explanation & Solution</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            {q.explanationSource || 'DETERMINISTIC_ANALYSIS'}
                          </span>
                        </div>

                        {q.stepByStepSolution && q.stepByStepSolution.length > 0 ? (
                          <div className="space-y-2.5 pl-1">
                            {q.stepByStepSolution.map((step: string, sIdx: number) => {
                              const cleaned = step.replace(/^Step\s*\d*:\s*/i, '');
                              return (
                                <div key={sIdx} className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3 text-slate-800 leading-relaxed font-sans shadow-2xs">
                                  <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-mono text-[11px] shrink-0 mt-0.5 font-bold">
                                    {sIdx + 1}
                                  </span>
                                  <div className="flex-1 space-y-0.5">
                                    <div className="text-[10px] font-mono font-bold uppercase text-blue-700 tracking-wider">
                                      Step {sIdx + 1}
                                    </div>
                                    <div className="text-xs text-slate-800">{cleaned}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">Step-by-step resolution synthesized from problem parameters.</p>
                        )}
                      </div>

                      {/* WHY YOUR ANSWER IS INCORRECT (FOR INCORRECT ANSWERS) */}
                      {(!q.isCorrect || isNotAttempted) && q.whyIncorrect && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wide">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <span>Why Your Answer Is Incorrect</span>
                          </div>
                          <p className="text-rose-900 leading-relaxed font-sans pl-1">
                            {q.whyIncorrect}
                          </p>
                        </div>
                      )}

                      {/* CONCEPT TO REVISE & MISTAKE TYPE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Concept to Revise Card */}
                        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wide">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>Concept to Revise</span>
                          </div>
                          <div className="text-slate-800 leading-relaxed font-sans whitespace-pre-line text-xs pl-1">
                            {typeof q.conceptToRevise === 'string' ? q.conceptToRevise : `${formatTopic(q.topic)} – Core Principles & Formulas`}
                          </div>
                        </div>

                        {/* Mistake Type Card */}
                        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wide">
                              <Brain className="h-4 w-4 text-purple-600" />
                              <span>Mistake Type</span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {q.mistakeType || (isNotAttempted ? 'Not Attempted' : q.isCorrect ? 'No Mistake' : 'Concept Misunderstanding')}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed pl-1">
                            {q.mistakeType === 'Concept Misunderstanding'
                              ? 'Misinterpreted the underlying proportional or structural relationship of the problem.'
                              : q.mistakeType === 'Formula Error'
                              ? 'Applied an incorrect formula or inverted unit conversion factors.'
                              : q.mistakeType === 'Calculation Error'
                              ? 'Arrived at the right approach but made an arithmetic error in the final step.'
                              : q.mistakeType === 'Careless Mistake'
                              ? 'Overlooked a key constraint or made an off-by-one error in sequence evaluation.'
                              : q.mistakeType === 'Logical Reasoning Error'
                              ? 'Concluded a relationship not guaranteed under all possible premises.'
                              : isNotAttempted
                              ? 'Question was skipped or timed out during the assessment round.'
                              : 'Demonstrated complete conceptual mastery and exact calculation.'}
                          </p>
                        </div>
                      </div>

                      {/* HOW TO IMPROVE */}
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2.5">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <span>How to Improve</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 pl-1">
                          {(q.howToImprove && q.howToImprove.length > 0 ? q.howToImprove : [
                            'Identify whether the relationship is direct or inverse before calculating.',
                            'Write down the governing formula and substitute given variables.',
                            'Sanity-check whether the final answer logically increases or decreases.',
                            'Verify intermediate unit conversions before finalizing the option.',
                          ]).map((tip: string, tIdx: number) => (
                            <li key={tIdx} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold shrink-0">✓</span>
                              <span className="leading-relaxed">{tip.replace(/^✓\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CORRECT ANSWER SUCCESS BOX */}
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="font-bold text-emerald-800 text-xs">
                            ✓ Correct Answer: {correctLabel}) {q.correctOptionText || options[correctIdx]}
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">
                            {q.whyCorrect || `Option ${correctLabel} satisfies all mathematical and logical conditions.`}
                          </p>
                        </div>
                      </div>

                      {/* ASK AI BUTTON */}
                      <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500 italic">
                          Need a deeper breakdown or want a similar practice question?
                        </div>
                        <Button
                          onClick={() => handleAskAI(q)}
                          size="sm"
                          variant="ai"
                          className="gap-2 text-xs font-semibold px-4 py-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Ask AI About This Question
                        </Button>
                      </div>
                    </Card>
                  );
                };

                if (aptitudeAnalysis.length === 0) {
                  return (
                    <Card className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs rounded-2xl shadow-2xs">
                      No aptitude questions found for this interview session.
                    </Card>
                  );
                }

                if (aptViewMode === 'single') {
                  const currentQ = aptitudeAnalysis[selectedAptIndex] || aptitudeAnalysis[0];
                  return (
                    <div className="space-y-4">
                      {renderQuestionCard(currentQ, selectedAptIndex)}

                      {/* Bottom Navigation */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selectedAptIndex <= 0}
                          onClick={() => {
                            setSelectedAptIndex(prev => Math.max(0, prev - 1));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous Question
                        </Button>

                        <span className="text-xs font-mono text-slate-500">
                          Question {selectedAptIndex + 1} of {aptitudeAnalysis.length}
                        </span>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selectedAptIndex >= aptitudeAnalysis.length - 1}
                          onClick={() => {
                            setSelectedAptIndex(prev => Math.min(aptitudeAnalysis.length - 1, prev + 1));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          Next Question <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {aptitudeAnalysis.map((q: any, idx: number) => renderQuestionCard(q, idx))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: CODING QUESTION PERFORMANCE & COMPLEXITY */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'coding' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-emerald-600" /> Coding Deep-Dive Analysis
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evidence-based execution diagnostics, exact failed test inputs/outputs, actual submitted code analysis, and algorithmic complexity.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-700">
                    {summary.codingAccepted} / {summary.codingTotal} Solved ({summary.testsPassed}/{summary.totalTests} Tests)
                  </div>
                  {codingAnalysis.length > 1 && (
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                      <button
                        onClick={() => setCodingViewMode('single')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          codingViewMode === 'single'
                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Single Problem
                      </button>
                      <button
                        onClick={() => setCodingViewMode('all')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          codingViewMode === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All Problems ({codingAnalysis.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Problem Selector Bar (Single Mode) */}
              {codingViewMode === 'single' && codingAnalysis.length > 1 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {codingAnalysis.map((p: any, idx: number) => {
                      const isCur = selectedCodingIndex === idx;
                      const isAcc = p.finalVerdict === 'ACCEPTED' || p.finalVerdict === 'PASSED';
                      const isPartial = !isAcc && (p.testsPassed || p.passedCount || 0) > 0;

                      return (
                        <button
                          key={p.questionId || idx}
                          onClick={() => setSelectedCodingIndex(idx)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isCur
                              ? 'bg-slate-900 border border-slate-900 text-white shadow-xs'
                              : isAcc
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : isPartial
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span>Problem #{idx + 1}</span>
                          <span className="text-[10px]">
                            {isAcc ? '✓' : isPartial ? '⚠️' : '✗'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">
                      Problem {selectedCodingIndex + 1} of {codingAnalysis.length}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={selectedCodingIndex >= codingAnalysis.length - 1}
                      onClick={() => setSelectedCodingIndex(prev => Math.min(codingAnalysis.length - 1, prev + 1))}
                    >
                      Next Problem <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Helper to Render a Problem Card */}
              {(() => {
                const renderCodingCard = (p: any, idx: number) => {
                  const probNumber = idx + 1;
                  const bestResult = p.bestResult || {
                    attemptNumber: 1,
                    passedCount: p.testsPassed || 0,
                    totalCount: p.testsTotal || 0,
                    status: p.finalVerdict || 'FAILED',
                    score: p.finalScore || 0,
                    verdictText: p.finalVerdict || 'FAILED',
                  };

                  const rawAttempts: any[] = (p.attempts && p.attempts.length > 0) ? p.attempts : [{
                    attemptNumber: 1,
                    language: p.language || 'Python',
                    sourceCode: p.submittedCode,
                    status: p.finalVerdict || 'FAILED',
                    passedCount: p.testsPassed || 0,
                    totalTests: p.testsTotal || 0,
                    executionTime: p.executionTime,
                    compileError: p.compileOutput,
                    runtimeError: p.runtimeError,
                    testResults: p.testResults || [],
                    aiAnalysis: p.aiAnalysis,
                  }];

                  const activeAttemptNum = selectedAttempts[idx] ?? bestResult.attemptNumber;
                  const curAtt = rawAttempts.find((a: any) => a.attemptNumber === activeAttemptNum) || rawAttempts[rawAttempts.length - 1];
                  const isCurAttAccepted = curAtt.status === 'ACCEPTED' || (curAtt.passedCount === curAtt.totalTests && curAtt.totalTests > 0);
                  const attAi = curAtt.aiAnalysis;
                  const attCode = curAtt.sourceCode || p.submittedCode || '';
                  const attCodeLines = attCode ? attCode.split('\n') : [];
                  const attFailedTests = curAtt.testResults
                    ? curAtt.testResults.filter((t: any) => !t.passed)
                    : (p.failedTests || []);

                  return (
                    <Card key={p.questionId || idx} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
                      {/* Top Header */}
                      <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              Problem #{probNumber}
                            </span>
                            <span className="font-bold text-slate-800">
                              {p.pattern || formatTopic(p.topic)}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                              [{(p.difficulty || 'Medium').toUpperCase()}]
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Deterministic Best Result Badge */}
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800">
                            <Award className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Best: Attempt #{bestResult.attemptNumber} · {bestResult.passedCount}/{bestResult.totalCount} Passed ({bestResult.score}%)</span>
                          </div>

                          <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 font-mono text-slate-700 border border-slate-200 font-medium">
                            {rawAttempts.length} {rawAttempts.length === 1 ? 'Attempt' : 'Attempts'}
                          </span>
                          <StatusBadge status={bestResult.status || p.finalVerdict || 'NOT_ATTEMPTED'} />
                          <Button
                            onClick={() => handleAskAICoding(p, probNumber)}
                            size="sm"
                            variant="ai"
                            className="gap-2 text-xs font-semibold px-3 py-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Ask AI About Problem
                          </Button>
                        </div>
                      </div>

                      {/* Attempt Progression History Bar (if multiple attempts or progression exists) */}
                      {(rawAttempts.length > 1 || p.progression) && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <span className="uppercase text-[11px] font-bold tracking-wider">Attempt Progression History</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">{rawAttempts.length} iterative submissions</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {(p.progression?.steps || rawAttempts.map((a: any) => ({
                              attemptNumber: a.attemptNumber,
                              passedCount: a.passedCount,
                              totalCount: a.totalTests,
                              status: a.status,
                              symbol: a.status === 'ACCEPTED' ? '✅' : a.passedCount > 0 ? '⚠️' : '❌',
                            }))).map((step: any, sIdx: number, arr: any[]) => {
                              const isBest = step.attemptNumber === bestResult.attemptNumber;
                              const isSelected = step.attemptNumber === activeAttemptNum;
                              return (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedAttempts(prev => ({ ...prev, [idx]: step.attemptNumber }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                      isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                        : isBest
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                        : step.status === 'ACCEPTED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : step.passedCount > 0
                                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    <span>Attempt {step.attemptNumber}: {step.passedCount}/{step.totalCount} {step.symbol}</span>
                                    {isBest && <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200/80 text-emerald-950 uppercase font-sans font-bold">Best</span>}
                                  </button>
                                  {sIdx < arr.length - 1 && <span className="text-slate-400 font-bold">→</span>}
                                </div>
                              );
                            })}
                          </div>

                          {p.progression?.explanation && (
                            <p className="text-xs text-slate-600 pl-0.5 italic pt-0.5">
                              💡 {p.progression.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Attempt Accordion / Selector Tabs */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-slate-500" /> Submissions & Attempt Breakdown
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            Viewing Attempt #{activeAttemptNum} {activeAttemptNum === bestResult.attemptNumber ? '★ (Best Result)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {rawAttempts.map((att: any) => {
                            const isSel = att.attemptNumber === activeAttemptNum;
                            const isBest = att.attemptNumber === bestResult.attemptNumber;
                            const isAcc = att.status === 'ACCEPTED';
                            const isPart = !isAcc && att.passedCount > 0;
                            return (
                              <button
                                key={att.attemptNumber}
                                onClick={() => setSelectedAttempts(prev => ({ ...prev, [idx]: att.attemptNumber }))}
                                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                                  isSel
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/20'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span>Attempt #{att.attemptNumber}</span>
                                <span className="text-[11px]">
                                  {isAcc ? '✓ (All Passed)' : isPart ? `⚠️ (${att.passedCount}/${att.totalTests})` : `✗ (${att.passedCount}/${att.totalTests})`}
                                </span>
                                {isBest && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans uppercase font-bold ${
                                    isSel ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    Best
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Attempt Detailed View */}
                      <div className="space-y-6 pt-2 border-t border-slate-100">
                        {/* Attempt Info & Metric Bar */}
                        <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">Attempt #{curAtt.attemptNumber}</span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {curAtt.language || 'Python'}
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded ${
                              isCurAttAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {curAtt.passedCount} / {curAtt.totalTests} Tests Passed
                            </span>
                            <span className="text-slate-500">
                              Runtime: {typeof curAtt.executionTime === 'number' ? `${curAtt.executionTime.toFixed(3)}s` : '0.05s'}
                            </span>
                          </div>

                          <Button
                            onClick={() => handleAskAIAttempt(p, probNumber, curAtt.attemptNumber)}
                            size="sm"
                            variant="secondary"
                            className="gap-1.5 text-xs font-semibold px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                            Ask AI About Attempt #{curAtt.attemptNumber}
                          </Button>
                        </div>

                        {/* Candidate Submitted Code */}
                        {attCode && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Terminal className="h-4 w-4 text-slate-600" /> Candidate Submitted Code (Attempt #{curAtt.attemptNumber})
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                {attCodeLines.length} lines of code
                              </span>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden font-mono text-xs shadow-md">
                              <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400">
                                <span className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${isCurAttAccepted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  <span className="font-semibold text-slate-300">{curAtt.language || 'Python'} Execution Source</span>
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(attCode);
                                    setCopiedCodeIdx(curAtt.attemptNumber);
                                    setTimeout(() => setCopiedCodeIdx(null), 2000);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                                >
                                  {copiedCodeIdx === curAtt.attemptNumber ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                  <span>{copiedCodeIdx === curAtt.attemptNumber ? 'Copied!' : 'Copy Code'}</span>
                                </button>
                              </div>
                              <div className="p-3 max-h-[320px] overflow-auto scrollbar-thin">
                                <table className="w-full border-collapse">
                                  <tbody>
                                    {attCodeLines.map((line: string, lIdx: number) => (
                                      <tr key={lIdx} className="hover:bg-slate-800/40">
                                        <td className="w-10 pr-3 text-right select-none text-slate-600 font-mono text-[11px] border-r border-slate-800">
                                          {lIdx + 1}
                                        </td>
                                        <td className="pl-3 font-mono whitespace-pre text-slate-200 text-xs">
                                          {line || ' '}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compiler or Runtime Crash Alert */}
                        {(curAtt.compileError || curAtt.runtimeError) && (
                          <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 space-y-3 text-xs">
                            <div className="flex items-center gap-2 text-rose-700 font-bold">
                              <AlertCircle className="h-4 w-4" />
                              <span>Execution Diagnostic Alert:</span>
                            </div>
                            <pre className="p-3 rounded-lg bg-rose-100/70 border border-rose-200 font-mono text-[11px] text-rose-900 overflow-x-auto whitespace-pre-wrap">
                              {curAtt.compileError || curAtt.runtimeError}
                            </pre>
                          </div>
                        )}

                        {/* FAILED TEST CASES â€” always visible when tests failed */}
                        {!isCurAttAccepted && attFailedTests.length > 0 && (
                          <div className="space-y-4 pt-1">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm uppercase tracking-wide">
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                                <span>Failed Test Cases ({attFailedTests.length} Failed)</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">Authoritative Sandbox Execution Facts</span>
                            </div>
                            <div className="space-y-4">
                              {attFailedTests.map((ft: any, fIdx: number) => {
                                const category = ft.failureCategory || 'LOGICAL_ERROR';
                                const catLabel = category.replace(/_/g, ' ');
                                return (
                                  <div key={fIdx} className="p-5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-4 text-xs font-sans shadow-2xs">
                                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-rose-100">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 text-[11px]">Test Case #{ft.testCaseNumber || fIdx + 1}</span>
                                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-rose-100 text-rose-700 border border-rose-200 uppercase">FAILED</span>
                                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 uppercase">{catLabel}</span>
                                      </div>
                                      {ft.lineLocation && (
                                        <span className="text-[11px] font-mono text-slate-500">Location: <strong className="text-slate-700">{ft.lineLocation}</strong></span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Test Input</div>
                                        <pre className="text-slate-800 whitespace-pre-wrap break-all text-[11px]">{ft.input || 'Standard test input'}</pre>
                                      </div>
                                      <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-emerald-800">Expected Output</div>
                                        <pre className="text-emerald-950 font-bold whitespace-pre-wrap break-all text-[11px]">{ft.expectedOutput || 'N/A'}</pre>
                                      </div>
                                      <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-rose-800">Your Output</div>
                                        <pre className="text-rose-950 font-bold whitespace-pre-wrap break-all text-[11px]">{ft.actualOutput || 'Wrong answer'}</pre>
                                      </div>
                                    </div>
                                    {(ft.whyItFails || ft.explanation) && (
                                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Why It Fails (Root Cause)</div>
                                        <p className="text-slate-800 leading-relaxed">{ft.whyItFails || ft.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                            AI CODING TUTOR PANEL
                            Renders for EVERY attempt (accepted + incorrect).
                            All data sourced from attAi (CodingAttemptAIAnalysis).
                        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                        {attAi && attAi.status === 'UNAVAILABLE' ? (
                          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-slate-500" />
                              <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">AI CODING ANALYSIS</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700 font-semibold">UNAVAILABLE</span>
                            </div>
                            <p className="text-xs text-slate-700">
                              AI analysis is currently unavailable for this submission. Your judge result and submission evidence are still available above.
                            </p>
                          </div>
                        ) : attAi ? (
                          <div className="space-y-5">

                            {/* ── Header ────────────────────────────────────── */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <span className="font-bold text-slate-900 uppercase tracking-wider text-sm">AI Coding Analysis</span>
                                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                                  (attAi.submissionStatus || (isCurAttAccepted ? 'ACCEPTED' : 'INCORRECT')) === 'ACCEPTED'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}>
                                  {(attAi.submissionStatus || (isCurAttAccepted ? 'ACCEPTED' : 'INCORRECT')) === 'ACCEPTED' ? '✓ ACCEPTED' : '✗ NEEDS CORRECTION'}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{attAi.analysisVersion || 'coding-tutor-v1'} · {attAi.model?.split('/').pop() || 'AI'}</span>
                            </div>

                            {/* â”€â”€ YOUR SUBMISSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            <div className={`p-4 rounded-xl border space-y-3 ${
                              isCurAttAccepted
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-rose-50/50 border-rose-200'
                            }`}>
                              <div className={`flex items-center gap-2 font-bold text-sm ${isCurAttAccepted ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {isCurAttAccepted
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  : <AlertCircle className="h-4 w-4 text-rose-600" />
                                }
                                <span>
                                  {attAi.submissionAnalysis?.verdict || (
                                    isCurAttAccepted
                                      ? `Accepted â€” ${curAtt.passedCount}/${curAtt.totalTests} tests passed`
                                      : `Incorrect â€” ${curAtt.passedCount}/${curAtt.totalTests} tests passed`
                                  )}
                                </span>
                              </div>
                              {attAi.submissionAnalysis?.explanation && (
                                <p className="text-xs text-slate-700 leading-relaxed">{attAi.submissionAnalysis.explanation}</p>
                              )}
                            </div>

                            {/* â”€â”€ YOUR CODE EXPLANATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {attAi.submissionAnalysis?.codeExplanation && (
                              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                                <div className="text-[11px] uppercase font-bold text-indigo-900 tracking-wider flex items-center gap-1.5">
                                  <Brain className="h-3.5 w-3.5 text-indigo-600" /> Your Code Explanation
                                </div>
                                <div className="space-y-1.5 text-xs text-slate-800">
                                  {attAi.submissionAnalysis.candidateApproach && (
                                    <div className="font-semibold text-indigo-800 text-[11px] uppercase tracking-wide">
                                      Approach: {attAi.submissionAnalysis.candidateApproach}
                                    </div>
                                  )}
                                  <p className="leading-relaxed">{attAi.submissionAnalysis.codeExplanation}</p>
                                </div>
                                <div className="flex items-center gap-4 pt-1.5 border-t border-slate-100 font-mono text-[11px] text-slate-600">
                                  <span>Your Time: <strong className="text-indigo-700">{attAi.submissionAnalysis.timeComplexity || (attAi as any).complexity?.time || 'O(n)'}</strong></span>
                                  <span>Your Space: <strong className="text-indigo-700">{attAi.submissionAnalysis.spaceComplexity || (attAi as any).complexity?.space || 'O(1)'}</strong></span>
                                </div>
                              </div>
                            )}

                            {/* â”€â”€ BRUTE FORCE APPROACH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {attAi.bruteForce && (
                              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                                <div className="text-[11px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-amber-700" /> Brute Force Approach
                                </div>
                                {attAi.bruteForce.available === false ? (
                                  <p className="text-xs text-slate-500 italic">{attAi.bruteForce.idea || 'Brute-force explanation unavailable.'}</p>
                                ) : (
                                  <div className="space-y-3">
                                    {attAi.bruteForce.idea && (
                                      <p className="text-xs text-slate-800 leading-relaxed"><strong>Idea:</strong> {attAi.bruteForce.idea}</p>
                                    )}
                                    {attAi.bruteForce.steps && attAi.bruteForce.steps.length > 0 && (
                                      <ol className="space-y-1 pl-1">
                                        {attAi.bruteForce.steps.map((step: string, sIdx: number) => (
                                          <li key={sIdx} className="flex items-start gap-2 text-xs text-slate-800">
                                            <span className="font-bold text-amber-700 shrink-0">{sIdx + 1}.</span>
                                            <span>{step}</span>
                                          </li>
                                        ))}
                                      </ol>
                                    )}
                                    {attAi.bruteForce.code && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase">
                                          <span>Brute Force Code ({curAtt.language || 'Python'})</span>
                                          <button
                                            onClick={() => { navigator.clipboard.writeText(attAi.bruteForce.code); setCopiedCorrectedIdx(-(curAtt.attemptNumber + 100)); setTimeout(() => setCopiedCorrectedIdx(null), 2000); }}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer font-mono font-semibold"
                                          >
                                            {copiedCorrectedIdx === -(curAtt.attemptNumber + 100) ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                            <span>{copiedCorrectedIdx === -(curAtt.attemptNumber + 100) ? 'Copied!' : 'Copy'}</span>
                                          </button>
                                        </div>
                                        <pre className="p-3 rounded-lg bg-slate-900 text-amber-100 font-mono text-xs overflow-x-auto leading-relaxed border border-amber-950/30">{attAi.bruteForce.code}</pre>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-4 font-mono text-[11px] text-slate-600 pt-1 border-t border-amber-200">
                                      <span>Time: <strong className="text-amber-800">{attAi.bruteForce.timeComplexity || 'O(nÂ²)'}</strong></span>
                                      <span>Space: <strong className="text-amber-800">{attAi.bruteForce.spaceComplexity || 'O(1)'}</strong></span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* â”€â”€ OPTIMAL APPROACH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {attAi.optimalApproach && (
                              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                                <div className="text-[11px] uppercase font-bold text-emerald-900 tracking-wider flex items-center gap-1.5">
                                  <TrendingUp className="h-3.5 w-3.5 text-emerald-700" /> Optimal Approach
                                </div>
                                <div className="space-y-3">
                                  {attAi.optimalApproach.idea && (
                                    <p className="text-xs text-slate-800 leading-relaxed"><strong>Idea:</strong> {attAi.optimalApproach.idea}</p>
                                  )}
                                  {attAi.optimalApproach.steps && attAi.optimalApproach.steps.length > 0 && (
                                    <ol className="space-y-1 pl-1">
                                      {attAi.optimalApproach.steps.map((step: string, sIdx: number) => (
                                        <li key={sIdx} className="flex items-start gap-2 text-xs text-slate-800">
                                          <span className="font-bold text-emerald-700 shrink-0">{sIdx + 1}.</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                  {attAi.optimalApproach.code && (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase">
                                        <span>Optimal Code ({curAtt.language || 'Python'})</span>
                                        <button
                                          onClick={() => { navigator.clipboard.writeText(attAi.optimalApproach.code); setCopiedOptimizedIdx(curAtt.attemptNumber); setTimeout(() => setCopiedOptimizedIdx(null), 2000); }}
                                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer font-mono font-semibold"
                                        >
                                          {copiedOptimizedIdx === curAtt.attemptNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                          <span>{copiedOptimizedIdx === curAtt.attemptNumber ? 'Copied!' : 'Copy'}</span>
                                        </button>
                                      </div>
                                      <pre className="p-3 rounded-lg bg-slate-900 text-emerald-100 font-mono text-xs overflow-x-auto leading-relaxed border border-emerald-950/30">{attAi.optimalApproach.code}</pre>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 font-mono text-[11px] text-slate-600 pt-1 border-t border-emerald-200">
                                    <span>Time: <strong className="text-emerald-800">{attAi.optimalApproach.timeComplexity || 'O(n)'}</strong></span>
                                    <span>Space: <strong className="text-emerald-800">{attAi.optimalApproach.spaceComplexity || 'O(n)'}</strong></span>
                                  </div>
                                  {attAi.optimalApproach.whyOptimal && (
                                    <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs text-slate-700 leading-relaxed">
                                      <strong className="text-emerald-900">Why This Is Better:</strong> {attAi.optimalApproach.whyOptimal}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* â”€â”€ OPTIMIZATION REVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {attAi.optimizationReview && (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                                  <TrendingUp className="h-3.5 w-3.5 text-slate-500" /> Optimization Review
                                  <span className={`ml-1 px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                                    attAi.optimizationReview.status === 'OPTIMAL'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}>
                                    {attAi.optimizationReview.status === 'OPTIMAL' ? 'âœ“ OPTIMAL' : 'âš¡ CAN BE OPTIMIZED'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{attAi.optimizationReview.explanation}</p>
                              </div>
                            )}

                            {/* â”€â”€ CORRECTED CODE â€” only when submission is incorrect â”€â”€ */}
                            {attAi.correction?.required && (
                              <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50/40 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-purple-200">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <span className="font-bold text-purple-950 uppercase tracking-wider text-sm">Corrected Implementation</span>
                                    <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">AI Generated</span>
                                  </div>
                                </div>

                                {attAi.correction.rootCause && (
                                  <div className="space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-purple-900 tracking-wider">Root Cause</div>
                                    <p className="text-xs text-slate-800 leading-relaxed">{attAi.correction.rootCause}</p>
                                  </div>
                                )}

                                {attAi.correction.correctedCode ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 uppercase">
                                      <span>Corrected Implementation ({curAtt.language || 'Python'})</span>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(attAi.correction.correctedCode); setCopiedCorrectedIdx(curAtt.attemptNumber); setTimeout(() => setCopiedCorrectedIdx(null), 2000); }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors cursor-pointer text-[10px] font-mono font-semibold"
                                      >
                                        {copiedCorrectedIdx === curAtt.attemptNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                        <span>{copiedCorrectedIdx === curAtt.attemptNumber ? 'Copied!' : 'Copy Corrected Code'}</span>
                                      </button>
                                    </div>
                                    <pre className="p-4 rounded-xl bg-slate-900 text-purple-100 font-mono text-xs overflow-x-auto leading-relaxed border border-purple-950/40">{attAi.correction.correctedCode}</pre>

                                    {attAi.correction.explanation && (
                                      <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs text-slate-700 leading-relaxed">
                                        <strong className="text-purple-900">Why This Fix Works:</strong> {attAi.correction.explanation}
                                      </div>
                                    )}

                                    {/* Verification status badge */}
                                    {attAi.correction.verificationStatus === 'VERIFIED' ? (
                                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Verified:</strong> This correction has been confirmed against the authoritative test suite.</span>
                                      </div>
                                    ) : (
                                      <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                        <span><strong>Unverified:</strong> This AI-generated correction has not been executed against the test suite. Review before use.</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 italic">
                                    AI correction unavailable for this submission. The candidate code and failure evidence are preserved above.
                                  </div>
                                )}
                              </div>
                            )}

                            {/* â”€â”€ No correction needed (accepted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {!attAi.correction?.required && isCurAttAccepted && (
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>âœ“ No correction required â€” your submission is already correct.</span>
                              </div>
                            )}

                            {/* â”€â”€ KEY CONCEPT + BUG PREVENTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            {(attAi.keyConcept || attAi.bugPrevention) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {attAi.keyConcept && (
                                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider flex items-center gap-1.5">
                                      <Brain className="h-3.5 w-3.5 text-indigo-600" /> Key Concept
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed">{attAi.keyConcept}</p>
                                  </div>
                                )}
                                {attAi.bugPrevention && (
                                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1.5">
                                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Bug Prevention
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed">{attAi.bugPrevention}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                            AI analysis is currently unavailable for this submission. Your judge result and submission evidence are still available above.
                          </div>
                        )}
                      </div>

                      {/* Bottom AI Prompt Bar */}
                      <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500 italic">
                          Have questions on why your logic produced this result or how to rewrite it?
                        </div>
                        <Button
                          onClick={() => handleAskAICoding(p, probNumber)}
                          size="sm"
                          variant="ai"
                          className="gap-2 text-xs font-semibold px-4 py-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Ask AI About Problem #{probNumber}
                        </Button>
                      </div>
                    </Card>
                  );
                };

                if (codingAnalysis.length === 0) {
                  return (
                    <Card className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs rounded-2xl shadow-2xs">
                      No coding problems recorded for this interview session.
                    </Card>
                  );
                }

                if (codingViewMode === 'single') {
                  const curProb = codingAnalysis[selectedCodingIndex] || codingAnalysis[0];
                  return (
                    <div className="space-y-4">
                      {renderCodingCard(curProb, selectedCodingIndex)}

                      {/* Bottom Navigation */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selectedCodingIndex <= 0}
                          onClick={() => {
                            setSelectedCodingIndex(prev => Math.max(0, prev - 1));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous Problem
                        </Button>

                        <span className="text-xs font-mono text-slate-500">
                          Problem {selectedCodingIndex + 1} of {codingAnalysis.length}
                        </span>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selectedCodingIndex >= codingAnalysis.length - 1}
                          onClick={() => {
                            setSelectedCodingIndex(prev => Math.min(codingAnalysis.length - 1, prev + 1));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          Next Problem <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {codingAnalysis.map((p: any, idx: number) => renderCodingCard(p, idx))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: HR BEHAVIORAL INTERVIEW REVIEW */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-600" /> HR Behavioral Interview Transcript & Feedback
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-turn conversational dialogue analysis, articulation scoring, and STAR framework recommendations.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-xs font-mono font-bold text-purple-700">
                  {summary.hrStatus === 'COMPLETED' ? '✓ Completed' : 'Not Attempted'}
                </div>
              </div>

              {/* HR Deep Behavioral Evaluation (10-dimensional radar & question analysis) */}
              <HRReportTab interviewId={interviewId} />

              {/* Communication Scores Card */}
              {hrAnalysis && (
                <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Overall Communication</div>
                      <div className="text-lg font-bold text-purple-600 font-mono mt-0.5">{hrAnalysis.communicationScore ?? 0} / 100</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Clarity Score</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{hrAnalysis.clarityScore ?? 0} / 100</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Relevance Score</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{hrAnalysis.relevanceScore ?? 0} / 100</div>
                    </div>
                  </div>

                  {hrAnalysis.starMethodGuidance && (
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-1.5">
                      <span className="font-semibold text-purple-900">🌟 Behavioral Interview Advice (STAR Method):</span>
                      <p className="text-slate-700 leading-relaxed font-sans">{hrAnalysis.starMethodGuidance}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Dialogue Transcript */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" /> Chronological Dialogue Transcript
                </h3>

                {hrTranscript.length > 0 ? (
                  <div className="space-y-3">
                    {hrTranscript.map((msg: any, idx: number) => {
                      const isInterviewer = msg.role === 'interviewer' || msg.role === 'ai';
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed font-sans ${
                            isInterviewer
                              ? 'bg-slate-50 border-slate-200 text-slate-800 ml-0 mr-12'
                              : 'bg-purple-50/70 border-purple-200 text-purple-900 mr-0 ml-12'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                              isInterviewer ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                            }`}
                          >
                            {isInterviewer ? 'HR' : 'YOU'}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>{isInterviewer ? 'Interviewer' : 'Your Response'}</span>
                              <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                            </div>
                            <p className="text-slate-800">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-200">
                    No HR dialogue transcript was recorded for this session.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: "ASK ABOUT MY INTERVIEW" AI CHATBOT */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" /> Ask About My Interview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ask questions about your answers, submitted code, mistakes, algorithmic complexity, and how to improve.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-mono flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Evidence Grounded
                </div>
              </div>

              {/* Chat Container Card */}
              <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col" style={{ height: '680px' }}>

                {/* Active Question Discussion Banner & Teaching Mode Pills */}
                {askAiQuestion && (
                  <div className="mb-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span>Discussing Q{askAiQuestion.questionNumber || 1}: {typeof askAiQuestion.topic === 'string' ? askAiQuestion.topic : (askAiQuestion.topic?.name || 'Question')}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          askAiQuestion.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {askAiQuestion.isCorrect ? '✓ Correct in Assessment' : '✗ Incorrect in Assessment'}
                        </span>
                      </div>
                      <button
                        onClick={() => setAskAiQuestion(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        ✕ Switch to General Chat
                      </button>
                    </div>

                    {/* 5 Teaching Mode Pills — always visible when question is selected */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleTeachingPill('HINT')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        💡 Give Me a Hint
                      </button>
                      <button
                        onClick={() => handleTeachingPill('EXPLAIN')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        📖 Explain the Answer
                      </button>
                      <button
                        onClick={() => handleTeachingPill('TEACH_ME')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        🎓 Teach Me From Basics
                      </button>
                      {!askAiQuestion.isCorrect && (
                        <button
                          onClick={() => handleTeachingPill('EXPLAIN_MISTAKE')}
                          disabled={isSending}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          🧐 Explain My Mistake
                        </button>
                      )}
                      <button
                        onClick={() => handleTeachingPill('SIMILAR_QUESTION')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        🧠 Give Me a Similar Question
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Coding Problem Discussion Banner & Action Pills */}
                {askAiCodingProblem && (
                  <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-950 font-semibold">
                        <Code2 className="h-4 w-4 text-emerald-600" />
                        <span>Discussing Coding #{askAiCodingProblem.problemNumber || 1}: {askAiCodingProblem.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          askAiCodingProblem.finalVerdict === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {askAiCodingProblem.finalVerdict === 'ACCEPTED'
                            ? `✓ All ${askAiCodingProblem.testsTotal || 0} Passed`
                            : `✗ ${askAiCodingProblem.testsPassed || 0}/${askAiCodingProblem.testsTotal || 0} Passed (${askAiCodingProblem.finalVerdict || 'FAILED'})`}
                        </span>
                      </div>
                      <button
                        onClick={() => setAskAiCodingProblem(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        ✕ Switch to General Chat
                      </button>
                    </div>

                    {/* 5 Coding Diagnostic Pills — always visible when coding problem is selected */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleCodingPill('WHAT_IS_WRONG')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        🧐 What is wrong in my code?
                      </button>
                      <button
                        onClick={() => handleCodingPill('WHICH_TEST_FAILED')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        ❌ Which test case failed?
                      </button>
                      <button
                        onClick={() => handleCodingPill('COMPLEXITY')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        ⚡ Why is my solution {askAiCodingProblem.candidateTimeComplexity || 'suboptimal'}?
                      </button>
                      <button
                        onClick={() => handleCodingPill('CORRECT_APPROACH')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        💡 Show optimal approach
                      </button>
                      <button
                        onClick={() => handleCodingPill('TEACH_PATTERN')}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        🎓 Teach me the pattern
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Stream */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin"
                >
                  {/* Welcome / Starter — shown only when no messages have been sent yet */}
                  {messages.length === 0 && !chatLoading && (
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-purple-950">
                        <Bot className="h-4 w-4 text-purple-600" /> Interview AI Intelligence Assistant
                      </div>
                      <p className="leading-relaxed text-slate-700">
                        I have analyzed your specific assessment evidence across Aptitude ({summary.aptitudePassed}/{summary.aptitudeTotal}), Coding ({summary.codingAccepted}/{summary.codingTotal} accepted), and the HR interview.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Click any question’s “Ask AI” button or pick a starter question below:
                      </p>
                      {/* Starter questions — ONLY shown before any messages */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          'Explain my biggest mistake',
                          'Was my coding approach optimal?',
                          'How can I improve my HR answers?',
                          'Show me a better approach',
                          'What should I practice next?',
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            disabled={isSending}
                            className="px-2.5 py-1 rounded-full bg-white hover:bg-purple-50 border border-purple-200 text-purple-800 text-[11px] shadow-sm transition-colors disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatLoading && (
                    <div className="text-xs text-slate-500 italic p-4">Loading conversation history...</div>
                  )}

                  {/* Message bubbles */}
                  {messages.map((m, msgIdx) => {
                    const isUser = m.role === 'user';
                    // Only show follow-up suggestions on the very last assistant message
                    const isLastAssistant = !isUser && msgIdx === messages.length - 1;

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 text-xs mt-0.5 shadow-sm">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`rounded-xl max-w-[85%] space-y-3 font-sans ${
                            isUser
                              ? 'bg-indigo-600 text-white rounded-br-none p-3.5 text-xs shadow-sm'
                              : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none p-4 shadow-sm'
                          }`}
                        >
                          {/* Content */}
                          {isUser ? (
                            <p className="text-xs leading-relaxed">{m.content}</p>
                          ) : (
                            renderMarkdown(m.content)
                          )}

                          {/* Practice Question Interactive Options (no answer hidden) */}
                          {m.practiceQuestion && m.practiceQuestion.options && (
                            <div className="pt-2 border-t border-slate-200 space-y-2">
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                                Select Your Answer:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {m.practiceQuestion.options.map((opt, optIdx) => {
                                  const letter = m.practiceQuestion?.optionLabels?.[optIdx] || String.fromCharCode(65 + optIdx);
                                  return (
                                    <button
                                      key={optIdx}
                                      onClick={() => handleAnswerPractice(m.practiceQuestion!.practiceQuestionId, letter)}
                                      disabled={isSending}
                                      className="p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-left text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-emerald-200 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 text-emerald-800">
                                        {letter}
                                      </span>
                                      <span className="flex-1">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Follow-up suggestions — ONLY on the latest assistant message */}
                          {isLastAssistant && m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700">
                                Suggested Follow-up:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.suggestedFollowups.map((f, fIdx) => (
                                  <button
                                    key={fIdx}
                                    onClick={() => handleSendMessage(f)}
                                    disabled={isSending}
                                    className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 text-[11px] transition-colors disabled:opacity-50"
                                  >
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 text-xs mt-0.5 shadow-sm">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isSending && (
                    <div className="flex items-center gap-3 text-xs text-purple-700 italic p-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
                      Analyzing session evidence and synthesizing answer...
                    </div>
                  )}
                </div>

                {/* Input Console — ONLY input + send, no suggestion repeat */}
                <div className="pt-3 border-t border-slate-200 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask about your aptitude choices, coding mistakes, or interview answers..."
                    disabled={isSending}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !inputMessage.trim()}
                    className="px-4 shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
