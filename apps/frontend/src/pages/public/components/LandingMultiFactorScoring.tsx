import React from 'react';

export const LandingMultiFactorScoring: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-[#f8fafc] border-b border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold block mb-3">
            BEYOND PASS OR FAIL
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            A CORRECT ANSWER IS ONLY ONE SIGNAL.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            The coding assessment evaluates multiple aspects of programming proficiency instead of relying only on whether the solution passes.
          </p>
        </div>

        {/* Unified Cohesive Assessment Dashboard */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 product-elevation p-6 sm:p-10 space-y-10">
          {/* Upper Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 pb-8 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Test-Case Correctness
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">88%</div>
              <span className="text-[11px] text-emerald-600 font-mono mt-1 block">Upper Decile</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Time Efficiency
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">76%</div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">O(N log N) Profile</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Space Efficiency
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">84%</div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">O(1) Aux Heap</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Code Quality
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">81%</div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">PEP8 Standard</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Problem-Solving
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">86%</div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Rapid Converge</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Error Frequency
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">12%</div>
              <span className="text-[11px] text-emerald-600 font-mono mt-1 block">Low Regressions</span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Recurring Errors
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono">3</div>
              <span className="text-[11px] text-amber-600 font-mono mt-1 block">Off-By-One Index</span>
            </div>
          </div>

          {/* Lower Comparative Dimension Bars & Distribution Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Multi-factor data progress meters */}
            <div className="lg:col-span-8 space-y-5 font-mono text-xs">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block mb-4">
                DETAILED MULTI-FACTOR PROFICIENCY GAUGES
              </span>
              <div>
                <div className="flex justify-between text-slate-800 font-semibold mb-1.5">
                  <span>TEST-CASE CORRECTNESS</span>
                  <span className="text-slate-950 font-bold">88%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-800 font-semibold mb-1.5">
                  <span>TIME EFFICIENCY (ASYMPTOTIC RUNTIME)</span>
                  <span className="text-slate-950 font-bold">76%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full" style={{ width: '76%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-800 font-semibold mb-1.5">
                  <span>SPACE EFFICIENCY (AUXILIARY MEMORY BOUND)</span>
                  <span className="text-slate-950 font-bold">84%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full" style={{ width: '84%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-800 font-semibold mb-1.5">
                  <span>CODE QUALITY (MODULARITY &amp; LINT AST)</span>
                  <span className="text-slate-950 font-bold">81%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full" style={{ width: '81%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-800 font-semibold mb-1.5">
                  <span>PROBLEM-SOLVING EFFICIENCY (SUBMISSION DELTA)</span>
                  <span className="text-slate-950 font-bold">86%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full" style={{ width: '86%' }} />
                </div>
              </div>
            </div>

            {/* Synthesized Radar Distribution Summary Box */}
            <div className="lg:col-span-4 p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs font-mono">
                <span className="font-bold text-slate-800 uppercase">PROFICIENCY SYNTHESIS</span>
                <span className="text-emerald-600 font-bold">VALIDATED</span>
              </div>
              <div className="space-y-3 font-sans text-xs text-slate-600 leading-relaxed">
                <p>
                  Instead of a binary score, NM Sandbox measures the holistic engineering profile. The candidate displays strong algorithmic bounds but is penalized for 3 recurring edge-condition fencepost iterations.
                </p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                  <span className="text-slate-400 block mb-0.5">Automated Verdict:</span>
                  <strong className="text-slate-900 font-bold">Production Ready Tier 2</strong> (Requires O(N) sliding window refactor review).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingMultiFactorScoring;
