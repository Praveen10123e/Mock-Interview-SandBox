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
  Search,
  Brain,
  MessageSquare,
  Dices,
  Hand,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { useQuestions } from '../../../api/questions';
import {
  useCreateTemplate,
  useUpdateTemplate,
} from '../../../api/templates';
import type {
  CreateTemplatePayload,
  InterviewTemplateItem,
  HRStageConfig,
  SelectionMode,
} from '../../../api/templates';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: InterviewTemplateItem | null;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Basic Information & Selection Mode
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [interviewType, setInterviewType] = useState('MOCK');
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState('MIXED');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('RANDOM');

  // Manual Mode: Stage 1 - Aptitude Questions (Min 5)
  const [selectedAptitude, setSelectedAptitude] = useState<any[]>([]);

  // Manual Mode: Stage 2 - Coding Problems (Min 2)
  const [selectedCoding, setSelectedCoding] = useState<any[]>([]);

  // Stage 3 - HR Conversational Interview
  const [hrInitialPrompt, setHrInitialPrompt] = useState(
    'Tell me about yourself, your educational background, and why you are interested in this software engineering role.'
  );
  const [hrInitialQuestionId, setHrInitialQuestionId] = useState<string | null>(null);
  const [hrAllowFollowUp, setHrAllowFollowUp] = useState(true);
  const [hrMaxFollowUps, setHrMaxFollowUps] = useState(3);

  // Navigation & Assessment Configuration
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [allowSkipping, setAllowSkipping] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(0);

  // Search queries for manual pickers
  const [aptSearch, setAptSearch] = useState('');
  const [codingSearch, setCodingSearch] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  // Curated Questions Loaders
  const { data: aptQuestionsRes } = useQuestions({
    questionType: 'APTITUDE',
    search: aptSearch.trim() || undefined,
    limit: 50,
  });

  const { data: codingQuestionsRes } = useQuestions({
    questionType: 'CODING',
    search: codingSearch.trim() || undefined,
    limit: 50,
  });

  const { data: hrQuestionsRes } = useQuestions({
    questionType: 'HR',
    limit: 20,
  });

  const availableAptitude = aptQuestionsRes?.data || [];
  const availableCoding = codingQuestionsRes?.data || [];
  const availableHr = hrQuestionsRes?.data || [];

  // Reset form when opened or when initialData changes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormError(null);

      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setInterviewType(initialData.interviewType || 'MOCK');
        setDuration(initialData.duration || 60);
        setDifficulty(initialData.difficulty || 'MIXED');
        setStatus((initialData.status as any) || 'PUBLISHED');

        const cfg = initialData.defaultConfiguration || {};
        const mode = cfg.selectionMode || (initialData.questions?.length > 0 ? 'MANUAL' : 'RANDOM');
        setSelectionMode(mode);

        setRandomizeOrder(!!cfg.randomizeOrder);
        setAllowSkipping(cfg.allowSkipping !== false);
        setTimePerQuestion(cfg.timePerQuestion || 0);

        const hrCfg: any = cfg.hrConfig || {};
        setHrInitialPrompt(
          hrCfg.initialPrompt ||
            'Tell me about yourself, your educational background, and why you are interested in this software engineering role.'
        );
        setHrInitialQuestionId(hrCfg.initialQuestionId || null);
        setHrAllowFollowUp(hrCfg.allowFollowUp !== false);
        setHrMaxFollowUps(hrCfg.maxFollowUps || 3);

        const allQ = initialData.questions || [];
        const apts = allQ
          .filter((q) => q.questionType === 'APTITUDE')
          .map((q, i) => ({
            id: q.questionId,
            title: q.title,
            questionType: 'APTITUDE',
            difficulty: q.difficulty,
            category: q.category,
            order: i + 1,
          }));

        const cods = allQ
          .filter((q) => q.questionType === 'CODING')
          .map((q, i) => ({
            id: q.questionId,
            title: q.title,
            questionType: 'CODING',
            difficulty: q.difficulty,
            category: q.category,
            order: i + 1,
          }));

        setSelectedAptitude(apts);
        setSelectedCoding(cods);
      } else {
        setName('');
        setDescription('');
        setInterviewType('MOCK');
        setDuration(60);
        setDifficulty('MIXED');
        setStatus('DRAFT');
        setSelectionMode('RANDOM');
        setRandomizeOrder(false);
        setAllowSkipping(true);
        setTimePerQuestion(0);
        setSelectedAptitude([]);
        setSelectedCoding([]);
        setHrInitialPrompt(
          'Tell me about yourself, your educational background, and why you are interested in this software engineering role.'
        );
        setHrInitialQuestionId(null);
        setHrAllowFollowUp(true);
        setHrMaxFollowUps(3);
      }
    }
  }, [initialData?.id, isOpen]);

  if (!isOpen) return null;

  // Aptitude toggling
  const handleToggleAptitude = (q: any) => {
    const exists = selectedAptitude.some((sq) => sq.id === q.id);
    if (exists) {
      setSelectedAptitude(selectedAptitude.filter((sq) => sq.id !== q.id));
    } else {
      setSelectedAptitude([
        ...selectedAptitude,
        {
          id: q.id,
          title: q.title,
          questionType: 'APTITUDE',
          difficulty: q.difficulty || 'MEDIUM',
          category: q.category?.name || q.category || 'Aptitude',
          order: selectedAptitude.length + 1,
        },
      ]);
    }
  };

  // Coding toggling
  const handleToggleCoding = (q: any) => {
    const exists = selectedCoding.some((sq) => sq.id === q.id);
    if (exists) {
      setSelectedCoding(selectedCoding.filter((sq) => sq.id !== q.id));
    } else {
      setSelectedCoding([
        ...selectedCoding,
        {
          id: q.id,
          title: q.title,
          questionType: 'CODING',
          difficulty: q.difficulty || 'MEDIUM',
          category: q.category?.name || q.category || 'Programming',
          order: selectedCoding.length + 1,
        },
      ]);
    }
  };

  // Validation status
  const isAptValid = selectionMode === 'RANDOM' || selectedAptitude.length >= 5;
  const isCodValid = selectionMode === 'RANDOM' || selectedCoding.length >= 2;
  const isHrValid = hrAllowFollowUp && hrInitialPrompt.trim().length > 0;
  const canPublish = isAptValid && isCodValid && isHrValid;

  // Save handler
  const handleSave = async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Template Name is required.');
      setStep(1);
      return;
    }

    if (status === 'PUBLISHED') {
      if (selectionMode === 'MANUAL') {
        if (!isAptValid) {
          setFormError(`Select at least 5 aptitude questions. (Currently selected: ${selectedAptitude.length})`);
          setStep(2);
          return;
        }
        if (!isCodValid) {
          setFormError(`Select at least 2 coding problems. (Currently selected: ${selectedCoding.length})`);
          setStep(3);
          return;
        }
      }
      if (!isHrValid) {
        setFormError('Configure the HR conversational interview stage.');
        setStep(selectionMode === 'RANDOM' ? 3 : 4);
        return;
      }
    }

    const hrConfig: HRStageConfig = {
      mode: 'CONVERSATIONAL',
      initialQuestionId: hrInitialQuestionId,
      initialPrompt: hrInitialPrompt.trim(),
      allowFollowUp: hrAllowFollowUp,
      maxFollowUps: hrMaxFollowUps,
    };

    const payload: CreateTemplatePayload = {
      name: name.trim(),
      description: description.trim(),
      interviewType,
      duration,
      difficulty,
      status,
      selectionMode,
      defaultConfiguration: {
        selectionMode,
        allowSkipping,
        randomizeOrder,
        timePerQuestion: timePerQuestion > 0 ? timePerQuestion : undefined,
        hrConfig,
        categories: ['Aptitude', 'Programming', 'HR'],
      },
      aptitudeQuestionIds: selectionMode === 'MANUAL' ? selectedAptitude.map((q) => q.id) : [],
      codingQuestionIds: selectionMode === 'MANUAL' ? selectedCoding.map((q) => q.id) : [],
      hrConfig,
    };

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

  // Wizard steps definition based on selectionMode
  const randomWizardSteps = [
    { stepNum: 1, label: '1. Basic Info', icon: Settings2, valid: !!name.trim() },
    { stepNum: 2, label: '2. Random Overview', icon: Dices, valid: true },
    { stepNum: 3, label: '3. HR Interview', icon: MessageSquare, valid: isHrValid },
    { stepNum: 4, label: '4. Review & Publish', icon: CheckCircle2, valid: canPublish },
  ];

  const manualWizardSteps = [
    { stepNum: 1, label: '1. Basic Info', icon: Settings2, valid: !!name.trim() },
    { stepNum: 2, label: `2. Aptitude (${selectedAptitude.length}/5)`, icon: Brain, valid: isAptValid },
    { stepNum: 3, label: `3. Coding (${selectedCoding.length}/2)`, icon: Code2, valid: isCodValid },
    { stepNum: 4, label: '4. HR Interview', icon: MessageSquare, valid: isHrValid },
    { stepNum: 5, label: '5. Review & Publish', icon: CheckCircle2, valid: canPublish },
  ];

  const currentWizardSteps = selectionMode === 'RANDOM' ? randomWizardSteps : manualWizardSteps;
  const maxStep = currentWizardSteps.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {initialData ? `Edit Template: ${initialData.name}` : 'Create Interview Template'}
            </h2>
            <p className="text-xs text-slate-500">
              Configure 3-stage mock interview structure: Aptitude (5 Qs) → Coding (1 Easy + 1 Med/Hard) → HR Conversational.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Dynamic Wizard Steps Navigation ───────────────────────────────── */}
        <div className={`grid grid-cols-${currentWizardSteps.length} border-b border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-medium text-center`}>
          {currentWizardSteps.map((s) => (
            <button
              key={s.stepNum}
              type="button"
              onClick={() => setStep(s.stepNum)}
              className={`py-3 px-2 border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                step === s.stepNum
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                  : s.valid
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: BASIC INFO & SELECTION MODE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Question Selection Mode Switcher */}
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-2.5">
                <label className="font-bold text-xs text-text-primary uppercase tracking-wider block">
                  Question Selection Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Random Mode Option */}
                  <div
                    onClick={() => setSelectionMode('RANDOM')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      selectionMode === 'RANDOM'
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-elevated/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-text-primary">
                        <Dices className="h-4 w-4 text-accent" />
                        Random / Automatic Selection
                      </div>
                      <span className="w-4 h-4 rounded-full border border-accent flex items-center justify-center">
                        {selectionMode === 'RANDOM' && <span className="w-2 h-2 rounded-full bg-accent" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Generates 5 random curated Aptitude questions + 2 Coding problems (1 Easy + 1 Med/Hard) per session dynamically.
                    </p>
                  </div>

                  {/* Manual Mode Option */}
                  <div
                    onClick={() => setSelectionMode('MANUAL')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      selectionMode === 'MANUAL'
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-elevated/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-text-primary">
                        <Hand className="h-4 w-4 text-accent" />
                        Manual / Selective Selection
                      </div>
                      <span className="w-4 h-4 rounded-full border border-accent flex items-center justify-center">
                        {selectionMode === 'MANUAL' && <span className="w-2 h-2 rounded-full bg-accent" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Faculty manually hand-picks specific questions (at least 5 Aptitude + 2 Coding) from the curated Question Bank.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-semibold text-text-primary">
                    Template Name <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Software Developer Mock Assessment (Campus 2028)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-semibold text-text-primary">Description</label>
                  <Textarea
                    rows={3}
                    placeholder="Provide candidate instructions, expectations, and evaluation focus..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary font-medium"
                  >
                    <option value="MOCK">Mock Interview</option>
                    <option value="PRACTICE">Practice Assessment</option>
                    <option value="TECHNICAL">Technical Interview</option>
                    <option value="HR">HR Interview</option>
                    <option value="CUSTOM">Custom Assessment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Target Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary"
                  >
                    <option value="MIXED">MIXED (Recommended)</option>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Total Duration (Minutes)</label>
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Publish Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-surface-elevated px-3 text-xs text-text-primary font-medium"
                  >
                    <option value="DRAFT">DRAFT (Save for editing)</option>
                    <option value="PUBLISHED">PUBLISHED (Validate stages & make available)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* RANDOM MODE: STEP 2 - RANDOM OVERVIEW */}
          {selectionMode === 'RANDOM' && step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-accent">
                  <Dices className="h-4 w-4" />
                  Automatic Random Question Generation Configured
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  When a candidate starts this assessment, the backend will randomly select unique questions from the curated dataset according to the strict difficulty distribution rules below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Aptitude Card */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-400">
                    <Brain className="h-4 w-4" />
                    Stage 1: Aptitude
                  </div>
                  <div className="font-bold text-sm text-text-primary">5 Random Questions</div>
                  <ul className="text-[11px] text-text-muted space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-blue-400" />
                      Curated Quantitative & Logical MCQs
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-blue-400" />
                      Randomized per candidate session
                    </li>
                  </ul>
                </div>

                {/* Coding Card */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <Code2 className="h-4 w-4" />
                    Stage 2: Coding
                  </div>
                  <div className="font-bold text-sm text-text-primary">2 Problems (Distribution)</div>
                  <ul className="text-[11px] text-text-muted space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                      1 Random <strong>Easy</strong> Problem
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                      1 Random <strong>Medium / Hard</strong> Problem
                    </li>
                  </ul>
                </div>

                {/* HR Card */}
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-400">
                    <MessageSquare className="h-4 w-4" />
                    Stage 3: HR Interview
                  </div>
                  <div className="font-bold text-sm text-text-primary">Conversational AI</div>
                  <ul className="text-[11px] text-text-muted space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-purple-400" />
                      Dynamic AI follow-up dialogue
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-purple-400" />
                      Response-based evaluation
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* MANUAL MODE: STEP 2 - APTITUDE PICKER */}
          {selectionMode === 'MANUAL' && step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${
                  isAptValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="font-bold">
                    Stage 1: Aptitude MCQ Questions ({selectedAptitude.length} Selected)
                  </span>
                </div>
                <div className="text-xs font-semibold">
                  {isAptValid
                    ? '✅ Minimum 5 Questions satisfied'
                    : `⚠️ Minimum 5 Required (Select ${5 - selectedAptitude.length} more)`}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search aptitude questions (Quantitative, Logical, Verbal)..."
                  value={aptSearch}
                  onChange={(e) => setAptSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider">
                    Curated Aptitude Question Bank ({availableAptitude.length})
                  </div>
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {availableAptitude.map((q: any) => {
                      const isSelected = selectedAptitude.some((sq) => sq.id === q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleAptitude(q)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'border-accent bg-accent/10 text-text-primary'
                              : 'border-border bg-surface hover:bg-surface-elevated/60 text-text-secondary'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-xs text-text-primary truncate">{q.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted">
                              <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-bold text-amber-400">
                                {q.difficulty}
                              </span>
                              <span>{q.topic?.name || q.topic || 'Quantitative'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-accent text-white' : 'bg-surface-elevated border border-border text-text-muted'
                            }`}
                          >
                            {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider flex items-center justify-between">
                    <span>Selected Aptitude Roster ({selectedAptitude.length})</span>
                    {selectedAptitude.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedAptitude([])}
                        className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                      >
                        Clear Stage
                      </button>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {selectedAptitude.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border text-center text-text-muted space-y-1">
                        <Brain className="h-6 w-6 mx-auto opacity-40" />
                        <p className="font-semibold">No aptitude questions selected</p>
                        <p className="text-[11px]">Select at least 5 questions from the left roster.</p>
                      </div>
                    ) : (
                      selectedAptitude.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-xl border border-border bg-surface-elevated/50 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 text-accent font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-text-primary truncate">{q.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleAptitude(q)}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MANUAL MODE: STEP 3 - CODING PICKER */}
          {selectionMode === 'MANUAL' && step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${
                  isCodValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  <span className="font-bold">
                    Stage 2: Coding Problems ({selectedCoding.length} Selected)
                  </span>
                </div>
                <div className="text-xs font-semibold">
                  {isCodValid
                    ? '✅ Minimum 2 Problems satisfied'
                    : `⚠️ Minimum 2 Required (Select ${2 - selectedCoding.length} more)`}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search curated programming problems..."
                  value={codingSearch}
                  onChange={(e) => setCodingSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider">
                    Curated Coding Question Bank ({availableCoding.length})
                  </div>
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {availableCoding.map((q: any) => {
                      const isSelected = selectedCoding.some((sq) => sq.id === q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleCoding(q)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'border-accent bg-accent/10 text-text-primary'
                              : 'border-border bg-surface hover:bg-surface-elevated/60 text-text-secondary'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-xs text-text-primary truncate">{q.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                  q.difficulty === 'EASY'
                                    ? 'text-emerald-400'
                                    : q.difficulty === 'HARD'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              <span>{q.category?.name || q.category || 'Algorithms'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-accent text-white' : 'bg-surface-elevated border border-border text-text-muted'
                            }`}
                          >
                            {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider flex items-center justify-between">
                    <span>Selected Coding Roster ({selectedCoding.length})</span>
                    {selectedCoding.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCoding([])}
                        className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                      >
                        Clear Stage
                      </button>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {selectedCoding.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border text-center text-text-muted space-y-1">
                        <Code2 className="h-6 w-6 mx-auto opacity-40" />
                        <p className="font-semibold">No coding problems selected</p>
                        <p className="text-[11px]">Select at least 2 coding problems from the left roster.</p>
                      </div>
                    ) : (
                      selectedCoding.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-xl border border-border bg-surface-elevated/50 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 text-accent font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-text-primary truncate">{q.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCoding(q)}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HR STAGE STEP (Step 3 in Random Mode, Step 4 in Manual Mode) */}
          {((selectionMode === 'RANDOM' && step === 3) || (selectionMode === 'MANUAL' && step === 4)) && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-accent">
                  <MessageSquare className="h-4 w-4" />
                  Stage 3: Real Conversational AI Interview
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  HR is not a static fixed-question list. The platform initiates a real-time conversational dialogue starting with an opening question or topic, dynamically generating follow-up questions tailored to the student's vocal and behavioral responses.
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-border bg-surface-elevated">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary flex items-center justify-between">
                    <span>Initial HR Opening Prompt / Scenario <span className="text-rose-400">*</span></span>
                    {availableHr.length > 0 && (
                      <select
                        onChange={(e) => {
                          const found = availableHr.find((h: any) => h.id === e.target.value);
                          if (found) {
                            setHrInitialQuestionId(found.id);
                            setHrInitialPrompt(found.title + (found.description ? `\n\n${found.description}` : ''));
                          }
                        }}
                        className="text-[10px] bg-surface border border-border rounded px-2 py-0.5 text-text-muted"
                      >
                        <option value="">Load from Curated HR Bank...</option>
                        {availableHr.map((h: any) => (
                          <option key={h.id} value={h.id}>
                            {h.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Enter opening question or prompt for the AI interviewer..."
                    value={hrInitialPrompt}
                    onChange={(e) => setHrInitialPrompt(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hrAllowFollowUp}
                      onChange={(e) => setHrAllowFollowUp(e.target.checked)}
                      className="mt-0.5 rounded text-accent"
                    />
                    <div>
                      <div className="font-semibold text-text-primary">Dynamic Follow-Up Questions</div>
                      <div className="text-[11px] text-text-muted">
                        AI interviewer analyzes response depth and poses relevant follow-ups.
                      </div>
                    </div>
                  </label>

                  <div className="space-y-1 p-3 rounded-xl border border-border bg-surface">
                    <label className="font-semibold text-text-primary block">
                      Max Follow-Up Turns
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={hrMaxFollowUps}
                      onChange={(e) => setHrMaxFollowUps(parseInt(e.target.value) || 3)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FINAL REVIEW & PUBLISH STEP */}
          {((selectionMode === 'RANDOM' && step === 4) || (selectionMode === 'MANUAL' && step === 5)) && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div className="p-4 rounded-xl border border-border bg-surface-elevated/60 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text-primary">{name || 'Untitled Template'}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-accent/10 border border-accent/20 text-accent uppercase">
                        {selectionMode === 'RANDOM' ? '🎲 Random Mode' : '✋ Manual Mode'}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{description || 'No description provided.'}</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-accent/10 border border-accent/20 text-accent uppercase">
                    {status}
                  </span>
                </div>

                {/* 3-Stage Assessment Composition Badges */}
                <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
                  <div className="font-bold text-xs text-text-primary uppercase tracking-wider text-text-muted">
                    Assessment Composition ({selectionMode === 'RANDOM' ? 'Dynamic Random' : 'Faculty Selected'})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isAptValid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Brain className="h-4 w-4" />
                        <span className="font-bold">Aptitude</span>
                      </div>
                      <span className="font-mono font-bold">
                        {selectionMode === 'RANDOM' ? '5 Random Qs' : `${selectedAptitude.length} Qs (Min 5)`}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isCodValid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Code2 className="h-4 w-4" />
                        <span className="font-bold">Coding</span>
                      </div>
                      <span className="font-mono font-bold">
                        {selectionMode === 'RANDOM' ? '1 Easy + 1 Med/Hard' : `${selectedCoding.length} Problems (Min 2)`}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isHrValid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-bold">HR Interview</span>
                      </div>
                      <span className="font-mono font-bold">Conversational</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 text-[11px]">
                  <div>
                    <span className="text-text-muted block">Duration</span>
                    <span className="font-bold text-text-primary">{duration} Minutes</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Interview Type</span>
                    <span className="font-bold text-text-primary">{interviewType}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Target Difficulty</span>
                    <span className="font-bold text-text-primary">{difficulty}</span>
                  </div>
                </div>
              </div>

              {/* Non-Publishable Alert */}
              {status === 'PUBLISHED' && !canPublish && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Cannot Publish Template — Validation Requirements Unmet:
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {!isAptValid && <li>Select at least 5 aptitude questions (currently {selectedAptitude.length}).</li>}
                    {!isCodValid && <li>Select at least 2 coding problems (currently {selectedCoding.length}).</li>}
                    {!isHrValid && <li>Configure initial HR prompt and conversational dialogue.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer rounded-lg h-9 px-3.5"
              >
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer rounded-lg h-9 px-3.5">
              Cancel
            </Button>

            {step < maxStep ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  if (step === 1 && !name.trim()) {
                    setFormError('Template Name is required.');
                    return;
                  }
                  setFormError(null);
                  setStep(step + 1);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold cursor-pointer rounded-lg h-9 px-4"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || (status === 'PUBLISHED' && !canPublish)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer rounded-lg h-9 px-4"
              >
                {isSaving ? 'Saving...' : initialData ? 'Update Template' : 'Save Template'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
