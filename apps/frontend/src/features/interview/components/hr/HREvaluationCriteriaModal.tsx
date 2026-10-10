import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { SCORING_DIMENSIONS } from '../../services/hrInterview.service';

interface HREvaluationCriteriaModalProps {
  onClose: () => void;
}

export const HREvaluationCriteriaModal: React.FC<HREvaluationCriteriaModalProps> = ({ onClose }) => {
  const weightedDims = SCORING_DIMENSIONS.filter((d) => d.weight > 0);
  const unweightedDims = SCORING_DIMENSIONS.filter((d) => d.weight === 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-[#0F172A]">HR Evaluation Criteria</h2>
          </div>
          <button
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#0F172A]">
          <p className="text-xs text-[#64748B] leading-relaxed">
            Your responses are evaluated across <strong>10 core behavioral dimensions</strong>. Each key competency
            contributes to your final assessment rating.
          </p>

          {/* Weighted Dimensions */}
          <div>
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">
              Weighted Competencies
            </h3>
            <div className="space-y-2">
              {weightedDims.map((dim) => (
                <div key={dim.key} className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: dim.color }} />
                      <span className="text-[#0F172A] font-semibold">{dim.label}</span>
                    </div>
                    <span className="font-bold text-xs" style={{ color: dim.color }}>{dim.weight}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${dim.weight * 5}%`, background: dim.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Signals */}
          <div>
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
              Additional Signals
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {unweightedDims.map((dim) => (
                <div key={dim.key} className="flex items-center justify-between p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                  <span className="text-[#334155] font-medium">{dim.label}</span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    Signal
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STAR Framework */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs">
            <h4 className="font-bold text-indigo-950 mb-2">Recommended: STAR Framework</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { letter: 'S', full: 'Situation', desc: 'Set context & problem' },
                { letter: 'T', full: 'Task', desc: 'Your responsibility' },
                { letter: 'A', full: 'Action', desc: 'Steps you personally took' },
                { letter: 'R', full: 'Result', desc: 'Quantifiable outcome' },
              ].map(({ letter, full, desc }) => (
                <div key={letter} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {letter}
                  </span>
                  <div>
                    <p className="font-semibold text-indigo-950 text-[11px]">{full}</p>
                    <p className="text-[10px] text-indigo-800 leading-tight">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-md bg-[#111827] text-white hover:bg-[#1F2937] shadow-xs cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
