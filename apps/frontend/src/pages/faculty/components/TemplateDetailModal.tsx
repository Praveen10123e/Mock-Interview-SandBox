import React from 'react';
import {
  X,
  Copy,
  Edit2,
  Brain,
  Code2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { InterviewTemplateItem } from '../../../api/templates';

interface TemplateDetailModalProps {
  template: InterviewTemplateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (template: InterviewTemplateItem) => void;
  onDuplicate?: (template: InterviewTemplateItem) => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  template,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
}) => {
  if (!isOpen || !template) return null;

  const cfg = template.defaultConfiguration || {};
  const questions = template.questions || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
                {template.interviewType}
              </span>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase font-mono ${
                  template.difficulty === 'EASY'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : template.difficulty === 'HARD'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {template.difficulty}
              </span>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase font-mono ${
                  template.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {template.status}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {template.name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {template.description || 'No description provided.'}
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm text-slate-800">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div>
              <span className="text-slate-500 block">Duration</span>
              <span className="font-bold text-slate-900 font-mono text-[13px]">{template.duration} Minutes</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Questions</span>
              <span className="font-bold text-slate-900 font-mono text-[13px]">{template.questionCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Randomize Order</span>
              <span className="font-bold text-slate-900">{cfg.randomizeOrder ? 'Enabled' : 'Fixed Sequence'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Allow Skipping</span>
              <span className="font-bold text-slate-900">{cfg.allowSkipping !== false ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Assessment Composition Grid */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-600 text-xs uppercase tracking-wider font-mono">
              Assessment Composition
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Stage 1: Aptitude</span>
                </div>
                <span className="font-mono font-bold text-xs text-blue-700">
                  {questions.filter((q) => q.questionType === 'APTITUDE').length} Qs (Min 5)
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Stage 2: Coding</span>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-700">
                  {questions.filter((q) => q.questionType === 'CODING').length} Problems (Min 2)
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Stage 3: HR Interview</span>
                </div>
                <span className="font-mono font-bold text-xs text-purple-700">
                  Conversational AI
                </span>
              </div>
            </div>
          </div>

          {/* Questions Roster */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-600 text-xs uppercase tracking-wider font-mono">
              Assigned Question Sequence ({questions.length})
            </h3>

            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.questionId || idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 flex items-center justify-between gap-3 text-xs sm:text-sm transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 truncate block text-[13px] sm:text-[14px]">{q.title}</span>
                      <span className="text-[11px] text-slate-500">{q.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] uppercase font-bold text-slate-600">
                      {q.questionType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                        q.difficulty === 'EASY'
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : q.difficulty === 'HARD'
                          ? 'text-rose-700 bg-rose-50 border border-rose-200'
                          : 'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Created: {new Date(template.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 cursor-pointer rounded-lg h-9 px-3.5"
                onClick={() => {
                  onClose();
                  onDuplicate(template);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </Button>
            )}

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 cursor-pointer rounded-lg h-9 px-3.5"
                onClick={() => {
                  onClose();
                  onEdit(template);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
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

export default TemplateDetailModal;
