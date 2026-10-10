import React from 'react';

export const LandingReportPreview: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white" id="reports">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-3">
            AFTER THE INTERVIEW
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            DON&apos;T JUST GET A SCORE.<br />UNDERSTAND YOUR PERFORMANCE.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            A deep, multi-dimensional assessment debrief generated immediately upon interview completion.
          </p>
        </div>

        {/* Large Realistic Performance Report Document UI */}
        <div className="w-full bg-[#fafcfe] rounded-2xl border-2 border-slate-200 product-elevation p-6 sm:p-12 space-y-10">
          {/* Report Header */}
          <div className="flex flex-wrap items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-500 font-bold block mb-1">
                CANDIDATE TECHNICAL ASSESSMENT REPORT
              </span>
              <h3 className="text-2xl font-black text-slate-950">NM-REPORT-TN-40892</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                PASSED BENCHMARK
              </span>
              <button className="px-4 py-2 rounded-lg bg-slate-900 text-white font-mono text-xs font-semibold hover:bg-slate-800 transition-colors">
                Download PDF
              </button>
            </div>
          </div>

          {/* Overall Score Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-xl bg-white border border-slate-200">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Overall Score</span>
              <div className="text-5xl font-black text-slate-950 font-mono">86%</div>
              <span className="text-xs font-semibold text-emerald-600 mt-1 block">Top 12th Percentile</span>
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Aptitude Stage</span>
              <div className="text-3xl font-black text-slate-900 font-mono">90%</div>
              <span className="text-xs text-slate-500 mt-1 block">27/30 Correct</span>
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Coding Stage</span>
              <div className="text-3xl font-black text-slate-900 font-mono">82%</div>
              <span className="text-xs text-slate-500 mt-1 block">Multi-Factor Weighted</span>
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">HR Stage</span>
              <div className="text-3xl font-black text-slate-900 font-mono">86%</div>
              <span className="text-xs text-slate-500 mt-1 block">High STAR Alignment</span>
            </div>
          </div>

          {/* Coding Analysis Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold">
              CODING ANALYSIS BREAKDOWN
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px] mb-1">Correctness</span>
                <div className="text-2xl font-bold text-slate-950">88%</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px] mb-1">Time Efficiency</span>
                <div className="text-2xl font-bold text-slate-950">76%</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px] mb-1">Space Efficiency</span>
                <div className="text-2xl font-bold text-slate-950">84%</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px] mb-1">Code Quality</span>
                <div className="text-2xl font-bold text-slate-950">81%</div>
              </div>
            </div>
          </div>

          {/* Prescriptive Improvement Areas */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold">
              TARGETED IMPROVEMENT AREAS
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <div className="font-bold text-amber-950">1. Algorithm efficiency</div>
                <p className="text-amber-900/80">Refactor quadratic O(n²) nested iteration passes into linear two-pointer or hash lookups.</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <div className="font-bold text-amber-950">2. Recurring coding errors</div>
                <p className="text-amber-900/80">Address off-by-one boundary checks in 0-indexed slicing intervals before submitting.</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <div className="font-bold text-amber-950">3. Problem-solving approach</div>
                <p className="text-amber-900/80">Establish dry-run test trace with edge empty buffers prior to final algorithm execution.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingReportPreview;
