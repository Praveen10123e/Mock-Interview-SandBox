import React from 'react';
import {
  X,
  Eye,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatExampleText } from '../../../utils/formatExampleText';

interface QuestionDetailModalProps {
  question: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (question: any) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !question) return null;

  const payload = question.metadata?.jsonPayload || {};
  const qType = (question.questionType || 'CODING').toUpperCase();

  const isCoding = qType === 'CODING' || qType === 'PROGRAMMING';
  const isMcq = qType === 'APTITUDE' || qType === 'MCQ';

  const execution = payload.execution || {};
  const testCases = payload.testCases || [];
  const examples = payload.examples || [];
  const constraints = payload.constraints || [];
  const hints = payload.hints || [];
  const options = payload.options || [];
  const correctOptionIndex = payload.correctOptionIndex ?? (question.expectedAnswer ? options.indexOf(question.expectedAnswer) : 0);
  const evaluationCriteria = payload.evaluationCriteria || [];
  const keyPoints = payload.keyPoints || [];
  const explanation = payload.explanation || question.idealAnswer;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
                {qType}
              </span>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase font-mono ${
                  question.difficulty === 'EASY'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : question.difficulty === 'HARD' || question.difficulty === 'EXPERT'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {question.difficulty}
              </span>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase font-mono ${
                  question.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : question.status === 'DRAFT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {question.status}
              </span>

              {isCoding && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-blue-50 border border-blue-200 text-blue-700">
                  {execution.executionMode || 'STANDARD_IO'}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {question.title}
            </h2>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500">
              <span>{question.category?.name || 'Category'}</span>
              {question.topic?.name && (
                <>
                  <span>•</span>
                  <span>{question.topic.name}</span>
                </>
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm text-slate-800">
          {/* Question / Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
              Question Statement
            </h3>
            <p className="whitespace-pre-line text-slate-800 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              {question.description}
            </p>
          </div>

          {/* 1. APTITUDE / MCQ OPTIONS VIEW */}
          {isMcq && options.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                Multiple Choice Options
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {options.map((opt: string, idx: number) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isCorrect = correctOptionIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 border border-slate-200 text-slate-600'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-xs sm:text-sm">{opt}</span>
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. EXPLANATION / SOLUTION NOTES */}
          {explanation && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                Solution & Explanation
              </h3>
              <p className="whitespace-pre-line text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-200 leading-relaxed text-xs sm:text-sm">
                {explanation}
              </p>
            </div>
          )}

          {/* 3. HR / BEHAVIORAL RUBRICS */}
          {(evaluationCriteria.length > 0 || keyPoints.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {evaluationCriteria.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                    Evaluation Criteria
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm">
                    {evaluationCriteria.map((c: any, i: number) => (
                      <li key={i}>{String(c)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {keyPoints.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                    Expected Key Points
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm">
                    {keyPoints.map((k: any, i: number) => (
                      <li key={i}>{String(k)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 4. PROGRAMMING EXAMPLES */}
          {isCoding && examples.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                Examples
              </h3>
              <div className="space-y-3">
                {examples.map((ex: any, i: number) => {
                  const formattedInput = formatExampleText(ex.input);
                  const formattedOutput = formatExampleText(ex.output);
                  return (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 font-mono text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider block">Input:</span>
                        <pre className="text-slate-900 font-mono font-medium bg-white p-2 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                          {formattedInput}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider block">Output:</span>
                        <pre className="text-emerald-700 font-mono font-bold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                          {formattedOutput}
                        </pre>
                      </div>
                      {ex.explanation && (
                        <div className="font-sans text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                          <span className="font-semibold text-slate-800">Explanation: </span>
                          <span className="whitespace-pre-wrap">{formatExampleText(ex.explanation)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. PROGRAMMING CONSTRAINTS & HINTS */}
          {(constraints.length > 0 || hints.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {constraints.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                    Constraints
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    {constraints.map((c: any, i: number) => (
                      <li key={i}>{c.constraint || c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hints.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                    Hints
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm">
                    {hints.map((h: any, i: number) => (
                      <li key={i}>{h.hint || h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 6. PROGRAMMING TEST CASES */}
          {isCoding && testCases.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-600 uppercase text-xs tracking-wider font-mono">
                  Configured Test Cases ({testCases.length})
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Verified Test Cases
                </span>
              </div>

              <div className="space-y-2">
                {testCases.map((tc: any, i: number) => {
                  const isHidden = tc.visibility === 'HIDDEN' || tc.isHidden;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between font-sans text-xs">
                        <span className="font-semibold text-slate-900">Test Case #{i + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono flex items-center gap-1 ${
                            isHidden
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Eye className="h-3 w-3" /> {isHidden ? 'Evaluation Case' : 'Sample Case'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider block">Input:</span>
                        <pre className="text-slate-900 font-mono bg-white p-2 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                          {formatExampleText(tc.input)}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider block">Expected:</span>
                        <pre className="text-emerald-700 font-mono font-semibold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                          {formatExampleText(tc.expectedOutput)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Created: {new Date(question.createdAt).toLocaleDateString()} • Version {question.version || 1}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer rounded-lg h-9 px-3.5"
                onClick={() => {
                  onClose();
                  onEdit(question);
                }}
              >
                Edit Question
              </Button>
            )}
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold cursor-pointer rounded-lg h-9 px-4" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionDetailModal;
