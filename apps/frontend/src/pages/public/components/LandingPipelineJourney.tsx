import React from 'react';

export const LandingPipelineJourney: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-[#f8fafc] border-t border-slate-200 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold block mb-3">
            END-TO-END PIPELINE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight uppercase">
            FROM PRACTICE TO PERFORMANCE INSIGHT.
          </h2>
        </div>

        {/* Large Continuous Horizontal Visual Journey */}
        <div className="border-t-2 border-slate-950 pt-8 overflow-x-auto pb-4">
          <div className="flex items-center gap-4 min-w-[1000px] text-xs font-mono font-bold text-slate-800">
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0">
              PRACTICE
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0">
              PRE-ASSESSMENT
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0 text-blue-600">
              APTITUDE
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0 text-blue-600">
              CODING
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0 text-blue-600">
              HR
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0">
              EVIDENCE COLLECTION
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-slate-900 text-white shadow-sm shrink-0">
              MULTI-FACTOR SCORING
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0">
              PERFORMANCE REPORT
            </div>
            <span className="text-slate-400">→</span>
            <div className="px-4 py-2.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm shrink-0">
              IMPROVEMENT INSIGHTS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPipelineJourney;
