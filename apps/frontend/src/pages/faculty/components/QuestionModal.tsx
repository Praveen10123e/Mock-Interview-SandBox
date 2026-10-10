import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code2,
  FileText,
  Settings2,
  Check,
  Eye,
  Sparkles,
  HelpCircle,
  ListOrdered,
  Award,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  useCreateQuestion,
  useUpdateQuestion,
  useValidateQuestion,
} from '../../../api/questions';
import type { CreateQuestionPayload, TestCasePayload } from '../../../api/questions';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any | null;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ isOpen, onClose, initialData }) => {
  const [activeTab, setActiveTab] = useState<string>('BASIC');

  // Basic Info State
  const [title, setTitle] = useState('');
  const [questionType, setQuestionType] = useState<string>('CODING');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'>('MEDIUM');
  const [category, setCategory] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [marks, setMarks] = useState(10);
  const [estimatedTime, setEstimatedTime] = useState(30); // in minutes
  const [description, setDescription] = useState('');

  // MCQ / Aptitude State
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');

  // HR / Behavioral & Theory State
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [evaluationCriteriaText, setEvaluationCriteriaText] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');

  // Programming / Coding State
  const [constraintsText, setConstraintsText] = useState('');
  const [examples, setExamples] = useState<Array<{ input: string; output: string; explanation: string }>>([]);
  const [hintsText, setHintsText] = useState('');
  const [executionMode, setExecutionMode] = useState<'STANDARD_IO' | 'FUNCTION'>('STANDARD_IO');
  const [starterCodes, setStarterCodes] = useState<Record<string, string>>({
    c: '',
    cpp: '',
    java: '',
    python: '',
    javascript: '',
  });
  const [activeLangTab, setActiveLangTab] = useState<'python' | 'javascript' | 'java' | 'cpp' | 'c'>('python');
  const [testCases, setTestCases] = useState<TestCasePayload[]>([]);

  // Validation State
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const validateMutation = useValidateQuestion();

  const isCoding = questionType === 'CODING' || questionType === 'PROGRAMMING';
  const isMcq = questionType === 'APTITUDE' || questionType === 'MCQ';
  const isHr = questionType === 'HR' || questionType === 'BEHAVIORAL';
  const isTheory = questionType === 'THEORY' || questionType === 'TECHNICAL' || questionType === 'DESCRIPTIVE';

  // Completely reset and populate form whenever initialData or isOpen changes
  const resetForm = (data: any | null) => {
    setActiveTab('BASIC');
    setValidationResult(null);
    setFormError(null);

    if (data) {
      const qType = (data.questionType || 'CODING').toUpperCase();
      setTitle(data.title || '');
      setQuestionType(qType);
      setDifficulty(data.difficulty || 'MEDIUM');
      setCategory(data.category?.name || data.category || data.categoryId || '');
      setTopic(data.topic?.name || data.topic || data.topicId || '');
      setStatus(data.status || 'DRAFT');
      setMarks(data.marks || 10);
      setEstimatedTime(data.estimatedTime ? Math.round(data.estimatedTime / 60) : 30);
      setDescription(data.description || '');

      const payload = data.metadata?.jsonPayload || {};

      // MCQ State population
      if (payload.options && Array.isArray(payload.options) && payload.options.length > 0) {
        setOptions(payload.options.map((o: any) => String(o)));
      } else {
        setOptions(['', '', '', '']);
      }

      let cIndex = 0;
      if (payload.correctOptionIndex !== undefined && payload.correctOptionIndex !== null) {
        cIndex = Number(payload.correctOptionIndex);
      } else if (data.expectedAnswer && payload.options) {
        const foundIdx = payload.options.findIndex((o: any) => String(o).trim() === String(data.expectedAnswer).trim());
        if (foundIdx !== -1) cIndex = foundIdx;
      }
      setCorrectOptionIndex(cIndex);
      setExplanation(payload.explanation || '');

      // Theory / HR fields
      setExpectedAnswer(data.expectedAnswer || '');
      if (payload.evaluationCriteria && Array.isArray(payload.evaluationCriteria)) {
        setEvaluationCriteriaText(payload.evaluationCriteria.map((c: any) => String(c)).join('\n'));
      } else {
        setEvaluationCriteriaText('');
      }
      if (payload.keyPoints && Array.isArray(payload.keyPoints)) {
        setKeyPointsText(payload.keyPoints.map((k: any) => String(k)).join('\n'));
      } else {
        setKeyPointsText('');
      }

      // Coding Execution & Starter Code
      const exec = payload.execution || {};
      setExecutionMode(exec.executionMode || 'STANDARD_IO');
      setStarterCodes({
        c: exec.languages?.c?.starterCode || '',
        cpp: exec.languages?.cpp?.starterCode || '',
        java: exec.languages?.java?.starterCode || '',
        python: exec.languages?.python?.starterCode || '',
        javascript: exec.languages?.javascript?.starterCode || '',
      });

      // Constraints & Hints
      if (payload.constraints && Array.isArray(payload.constraints) && payload.constraints.length > 0) {
        setConstraintsText(payload.constraints.map((c: any) => c.constraint || c).join('\n'));
      } else {
        setConstraintsText('');
      }
      if (payload.hints && Array.isArray(payload.hints) && payload.hints.length > 0) {
        setHintsText(payload.hints.map((h: any) => h.hint || h).join('\n'));
      } else {
        setHintsText('');
      }

      // Examples
      if (payload.examples && Array.isArray(payload.examples) && payload.examples.length > 0) {
        setExamples(
          payload.examples.map((ex: any) => ({
            input: typeof ex.input === 'object' ? JSON.stringify(ex.input) : ex.input || '',
            output: typeof ex.output === 'object' ? JSON.stringify(ex.output) : ex.output || '',
            explanation: ex.explanation || '',
          }))
        );
      } else {
        setExamples([]);
      }

      // Test Cases
      if (payload.testCases && Array.isArray(payload.testCases) && payload.testCases.length > 0) {
        setTestCases(
          payload.testCases.map((tc: any) => ({
            input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input ?? ''),
            expectedOutput: String(tc.expectedOutput ?? ''),
            visibility: tc.visibility === 'HIDDEN' || tc.isHidden ? 'HIDDEN' : 'VISIBLE',
            isHidden: tc.visibility === 'HIDDEN' || tc.isHidden,
            explanation: tc.explanation || '',
          }))
        );
      } else {
        setTestCases(qType === 'CODING' ? [{ input: '', expectedOutput: '', visibility: 'VISIBLE', explanation: '' }] : []);
      }
    } else {
      // Create mode defaults
      setTitle('');
      setQuestionType('CODING');
      setDifficulty('MEDIUM');
      setCategory('');
      setTopic('');
      setStatus('DRAFT');
      setMarks(10);
      setEstimatedTime(30);
      setDescription('');
      setOptions(['', '', '', '']);
      setCorrectOptionIndex(0);
      setExplanation('');
      setExpectedAnswer('');
      setEvaluationCriteriaText('');
      setKeyPointsText('');
      setConstraintsText('');
      setHintsText('');
      setExamples([{ input: '', output: '', explanation: '' }]);
      setExecutionMode('STANDARD_IO');
      setStarterCodes({ c: '', cpp: '', java: '', python: '', javascript: '' });
      setTestCases([
        { input: '', expectedOutput: '', visibility: 'VISIBLE', explanation: '' },
        { input: '', expectedOutput: '', visibility: 'HIDDEN', explanation: '' },
      ]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm(initialData);
    }
  }, [initialData?.id, isOpen]);

  if (!isOpen) return null;

  // Build Payload
  const buildPayload = (): CreateQuestionPayload => {
    const constraints = constraintsText
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);
    const hints = hintsText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);
    const evalCriteria = evaluationCriteriaText
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);
    const keyPoints = keyPointsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);
    const formattedExamples = examples.filter((ex) => ex.input.trim() || ex.output.trim());

    const languagesConfig: Record<string, any> = {};
    if (isCoding) {
      Object.entries(starterCodes).forEach(([langKey, code]) => {
        if (code && code.trim()) {
          languagesConfig[langKey] = {
            language: langKey.toUpperCase(),
            starterCode: code,
          };
        }
      });
    }

    return {
      title: title.trim(),
      description: description.trim(),
      questionType,
      difficulty,
      category: category.trim(),
      topic: topic.trim() || undefined,
      status,
      marks,
      estimatedTime: estimatedTime * 60,
      hints: hints.length > 0 ? hints : undefined,

      // MCQ fields
      ...(isMcq && {
        options: options.map((o) => o.trim()),
        correctOptionIndex,
        correctAnswer: options[correctOptionIndex] || undefined,
        explanation: explanation.trim() || undefined,
      }),

      // Theory / HR fields
      ...((isHr || isTheory) && {
        expectedAnswer: expectedAnswer.trim() || undefined,
        explanation: explanation.trim() || undefined,
        evaluationCriteria: evalCriteria.length > 0 ? evalCriteria : undefined,
        keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
      }),

      // Coding fields
      ...(isCoding && {
        executionMode,
        constraints: constraints.length > 0 ? constraints : undefined,
        examples: formattedExamples.length > 0 ? formattedExamples : undefined,
        testCases,
        languages: Object.keys(languagesConfig).length > 0 ? languagesConfig : undefined,
      }),
    };
  };

  // Run validation
  const handleValidate = async () => {
    setFormError(null);
    try {
      const payload = buildPayload();
      const res = await validateMutation.mutateAsync(payload);
      setValidationResult(res);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.message);
    }
  };

  // Submit Save
  const handleSave = async () => {
    setFormError(null);
    const payload = buildPayload();

    if (!payload.title || !payload.description || !payload.category) {
      setFormError('Please fill in Title, Description, and Category.');
      setActiveTab('BASIC');
      return;
    }

    if (isMcq) {
      const validOptions = options.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) {
        setFormError('At least 2 non-empty options are required for Aptitude/MCQ questions.');
        setActiveTab('MCQ');
        return;
      }
    }

    if (isCoding && (testCases.length === 0 || !testCases[0].input || !testCases[0].expectedOutput)) {
      setFormError('Please configure at least one complete test case for coding questions.');
      setActiveTab('TEST_CASES');
      return;
    }

    try {
      if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Modal Header ──────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-600" />
              {initialData ? `Edit Question: ${initialData.title}` : 'Create New Question'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold font-mono text-[11px]">
                {questionType}
              </span>
              <span>•</span>
              <span>Configure fields tailored for {questionType.toLowerCase()} evaluation.</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Dynamic Navigation Tabs ───────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 bg-white px-4 gap-2 overflow-x-auto text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('BASIC')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'BASIC'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Basic Info
          </button>

          {/* 1. APTITUDE / MCQ TABS */}
          {isMcq && (
            <button
              onClick={() => setActiveTab('MCQ')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'MCQ'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              MCQ Options & Answer
            </button>
          )}

          {/* 2. PROGRAMMING TABS */}
          {isCoding && (
            <>
              <button
                onClick={() => setActiveTab('DESCRIPTION')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'DESCRIPTION'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Description & Examples
              </button>

              <button
                onClick={() => setActiveTab('EXECUTION')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'EXECUTION'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                Execution & Starter Code
              </button>

              <button
                onClick={() => setActiveTab('TEST_CASES')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'TEST_CASES'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Test Cases ({testCases.length})
              </button>
            </>
          )}

          {/* 3. HR / BEHAVIORAL TABS */}
          {isHr && (
            <button
              onClick={() => setActiveTab('HR_RUBRIC')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'HR_RUBRIC'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Prompt & Evaluation Rubric
            </button>
          )}

          {/* 4. THEORY TABS */}
          {isTheory && (
            <button
              onClick={() => setActiveTab('THEORY_CONTENT')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'THEORY_CONTENT'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Question & Ideal Answer
            </button>
          )}

          {/* General Hints Tab */}
          <button
            onClick={() => setActiveTab('HINTS')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'HINTS'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Hints & Rubrics
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'BASIC' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-semibold text-text-primary">
                    Question Title <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Two Sum, Series Next Number, Where do you see yourself in 5 years?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">
                    Question Domain / Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary font-medium"
                  >
                    <option value="CODING">CODING (Compiler / Code Execution)</option>
                    <option value="APTITUDE">APTITUDE (MCQ / Multiple Choice)</option>
                    <option value="HR">HR / BEHAVIORAL (Interview Evaluation)</option>
                    <option value="THEORY">THEORY / CONCEPTUAL (Subject Q&A)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">
                    Difficulty <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                    <option value="EXPERT">EXPERT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">
                    Publish Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary font-medium"
                  >
                    <option value="DRAFT">DRAFT (Hidden from Students)</option>
                    <option value="PUBLISHED">PUBLISHED (Available to Students)</option>
                    <option value="ARCHIVED">ARCHIVED (Inactive)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Arrays, Quantitative, HR, Operating Systems"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Topic</label>
                  <Input
                    placeholder="e.g., Number Series, Profit & Loss, Work Ethic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Marks / Weightage</label>
                  <Input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(parseInt(e.target.value) || 10)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Estimated Time (Minutes)</label>
                  <Input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              {/* Statement preview */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-semibold text-text-primary">
                  Question / Problem Statement <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="State the full question or problem statement here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: APTITUDE / MCQ OPTIONS & ANSWER */}
          {isMcq && activeTab === 'MCQ' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">
                  Question / Problem Statement <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g., Find the next number in the series: 2, 6, 12, 20, 30, ?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Options Section */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">Multiple Choice Options</h3>
                    <p className="text-[11px] text-text-muted">
                      Select the radio button beside the correct option.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => setOptions([...options, ''])}
                  >
                    <Plus className="h-3 w-3" /> Add Option
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect = correctOptionIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                          isCorrect
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-border bg-surface-elevated/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCorrectOptionIndex(idx)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer shrink-0 transition-colors ${
                            isCorrect
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-surface-elevated border border-border text-text-muted hover:border-emerald-500/50'
                          }`}
                          title={`Set option ${letter} as correct answer`}
                        >
                          {letter}
                        </button>

                        <div className="flex-1">
                          <Input
                            placeholder={`Option ${letter} text...`}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...options];
                              updated[idx] = e.target.value;
                              setOptions(updated);
                            }}
                            className="text-xs"
                          />
                        </div>

                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                            Correct Answer
                          </span>
                        )}

                        {options.length > 2 && (
                          <button
                            type="button"
                            className="text-rose-400 hover:text-rose-300 p-1 shrink-0 cursor-pointer"
                            onClick={() => {
                              const updated = options.filter((_, i) => i !== idx);
                              setOptions(updated);
                              if (correctOptionIndex >= updated.length) {
                                setCorrectOptionIndex(0);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-semibold text-text-primary">
                  Step-by-Step Explanation / Solution Key
                </label>
                <Textarea
                  rows={4}
                  placeholder="Explain why the chosen option is correct. e.g., Differences are 4, 6, 8, 10, so next difference is 12 -> 30 + 12 = 42."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: PROGRAMMING DESCRIPTION & EXAMPLES */}
          {isCoding && activeTab === 'DESCRIPTION' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">
                  Problem Description <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  rows={5}
                  placeholder="State the problem clearly, including input and output expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Examples */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-text-primary">Examples (Visible to Students)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => setExamples([...examples, { input: '', output: '', explanation: '' }])}
                  >
                    <Plus className="h-3 w-3" /> Add Example
                  </Button>
                </div>

                {examples.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border bg-surface-elevated/40 space-y-2">
                    <div className="flex items-center justify-between text-text-secondary font-medium">
                      <span>Example {idx + 1}</span>
                      {examples.length > 1 && (
                        <button
                          type="button"
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          onClick={() => setExamples(examples.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Input (e.g., nums = [2,7,11,15], target = 9)"
                        value={ex.input}
                        onChange={(e) => {
                          const updated = [...examples];
                          updated[idx].input = e.target.value;
                          setExamples(updated);
                        }}
                      />
                      <Input
                        placeholder="Output (e.g., [0,1])"
                        value={ex.output}
                        onChange={(e) => {
                          const updated = [...examples];
                          updated[idx].output = e.target.value;
                          setExamples(updated);
                        }}
                      />
                    </div>
                    <Input
                      placeholder="Explanation (Optional)"
                      value={ex.explanation}
                      onChange={(e) => {
                        const updated = [...examples];
                        updated[idx].explanation = e.target.value;
                        setExamples(updated);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Constraints */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-semibold text-text-primary">Constraints (One per line)</label>
                <Textarea
                  rows={3}
                  placeholder="1 <= n <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
                  value={constraintsText}
                  onChange={(e) => setConstraintsText(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: PROGRAMMING EXECUTION & STARTER CODE */}
          {isCoding && activeTab === 'EXECUTION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-3">
                <label className="font-semibold text-text-primary">Question Execution Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col space-y-1 ${
                      executionMode === 'STANDARD_IO'
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>STANDARD_IO (Stdin / Stdout)</span>
                      {executionMode === 'STANDARD_IO' && <Check className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Candidate writes complete program reading from stdin and printing to stdout.
                    </p>
                    <input
                      type="radio"
                      name="execMode"
                      className="hidden"
                      checked={executionMode === 'STANDARD_IO'}
                      onChange={() => setExecutionMode('STANDARD_IO')}
                    />
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col space-y-1 ${
                      executionMode === 'FUNCTION'
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>FUNCTION (Function Signature)</span>
                      {executionMode === 'FUNCTION' && <Check className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Candidate implements a specific function/class; test harness wraps input and calls it.
                    </p>
                    <input
                      type="radio"
                      name="execMode"
                      className="hidden"
                      checked={executionMode === 'FUNCTION'}
                      onChange={() => setExecutionMode('FUNCTION')}
                    />
                  </label>
                </div>
              </div>

              {/* Language Starter Code Tabs */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-text-primary">
                  Language Starter Code Templates (Optional Customization)
                </label>
                <div className="flex border-b border-border gap-1 overflow-x-auto">
                  {(['python', 'javascript', 'java', 'cpp', 'c'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLangTab(lang)}
                      className={`px-3 py-1.5 text-xs font-mono uppercase rounded-t-lg transition-colors cursor-pointer ${
                        activeLangTab === lang
                          ? 'bg-surface-elevated border-t border-x border-border text-accent font-bold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={8}
                  className="font-mono text-xs"
                  placeholder={`Starter template for ${activeLangTab.toUpperCase()}...`}
                  value={starterCodes[activeLangTab]}
                  onChange={(e) =>
                    setStarterCodes({
                      ...starterCodes,
                      [activeLangTab]: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* TAB: PROGRAMMING TEST CASES */}
          {isCoding && activeTab === 'TEST_CASES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary">Test Case Management</h3>
                  <p className="text-[11px] text-text-muted">
                    Add visible test cases for candidate dry-runs and hidden test cases for final grading.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    setTestCases([
                      ...testCases,
                      { input: '', expectedOutput: '', visibility: 'HIDDEN', explanation: '' },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add Test Case
                </Button>
              </div>

              <div className="space-y-3">
                {testCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border space-y-3 ${
                      tc.visibility === 'HIDDEN'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border bg-surface-elevated/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">Test Case #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...testCases];
                            const nextVis = updated[idx].visibility === 'HIDDEN' ? 'VISIBLE' : 'HIDDEN';
                            updated[idx].visibility = nextVis;
                            updated[idx].isHidden = nextVis === 'HIDDEN';
                            setTestCases(updated);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            tc.visibility === 'HIDDEN'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {tc.visibility === 'HIDDEN' ? (
                            <>
                              <Eye className="h-3 w-3" /> Evaluation Case
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" /> Sample Case
                            </>
                          )}
                        </button>
                      </div>

                      {testCases.length > 1 && (
                        <button
                          type="button"
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary">Input</label>
                        <Textarea
                          rows={2}
                          className="font-mono text-xs"
                          placeholder="Input passed to stdin or function arguments..."
                          value={tc.input}
                          onChange={(e) => {
                            const updated = [...testCases];
                            updated[idx].input = e.target.value;
                            setTestCases(updated);
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary">Expected Output</label>
                        <Textarea
                          rows={2}
                          className="font-mono text-xs"
                          placeholder="Expected stdout or return value..."
                          value={tc.expectedOutput}
                          onChange={(e) => {
                            const updated = [...testCases];
                            updated[idx].expectedOutput = e.target.value;
                            setTestCases(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: HR / BEHAVIORAL RUBRIC */}
          {isHr && activeTab === 'HR_RUBRIC' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">
                  Interview Prompt / Question <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="e.g., Tell me about a time you resolved a conflict within your team."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Evaluation Rubrics (One per line)</label>
                  <Textarea
                    rows={5}
                    placeholder="Clear description of the context using STAR method&#10;Accountability and emotional maturity demonstrated&#10;Concrete positive outcome achieved"
                    value={evaluationCriteriaText}
                    onChange={(e) => setEvaluationCriteriaText(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Expected Key Points (One per line)</label>
                  <Textarea
                    rows={5}
                    placeholder="Active listening&#10;Focus on shared team goals&#10;Constructive resolution"
                    value={keyPointsText}
                    onChange={(e) => setKeyPointsText(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: THEORY CONTENT */}
          {isTheory && activeTab === 'THEORY_CONTENT' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">
                  Question / Theoretical Problem <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="e.g., Explain the difference between process and thread in Operating Systems."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="font-semibold text-text-primary">Ideal / Model Answer</label>
                <Textarea
                  rows={4}
                  placeholder="Provide the model answer or key theoretical definitions..."
                  value={expectedAnswer}
                  onChange={(e) => setExpectedAnswer(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">Detailed Explanation / Notes</label>
                <Textarea
                  rows={4}
                  placeholder="Detailed breakdown, memory layout differences, IPC mechanisms..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: HINTS */}
          {activeTab === 'HINTS' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary">Hints / Guiding Questions (One per line)</label>
                <Textarea
                  rows={6}
                  placeholder="Think about time complexity constraints...&#10;Consider edge cases like empty array or negative numbers..."
                  value={hintsText}
                  onChange={(e) => setHintsText(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Validation Feedback Box */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                validationResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Question is valid and ready to publish!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    <span>Validation errors found:</span>
                  </>
                )}
              </div>
              {validationResult.errors?.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationResult.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
              {validationResult.warnings?.length > 0 && (
                <div className="text-amber-400 text-[11px] pt-1">
                  Warnings: {validationResult.warnings.join(' ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            className="w-full sm:w-auto text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 cursor-pointer rounded-lg h-9 px-3.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Validate Question
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer rounded-lg h-9 px-3.5">
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer rounded-lg h-9 px-4"
            >
              {isSaving ? 'Saving...' : initialData ? 'Update Question' : 'Save Question'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
