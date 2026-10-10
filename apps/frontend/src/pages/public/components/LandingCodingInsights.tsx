import React from 'react';

export const LandingCodingInsights: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-[#f8fafc] border-y border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold block mb-3">
            CODING INSIGHTS
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            DON&apos;T JUST SEE THE ERROR.<br />UNDERSTAND THE PATTERN.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Deep structural static and runtime analysis detects asymptotic anti-patterns across candidate test attempts.
          </p>
        </div>

        {/* Coding Analysis Inspector Interface */}
        <div className="w-full rounded-2xl bg-[#090d14] border border-slate-800 product-elevation overflow-hidden text-slate-300 font-mono text-xs">
          {/* Titlebar */}
          <div className="px-6 py-4 bg-[#05080c] border-b border-slate-800 flex items-center justify-between">
            <span className="text-white font-bold">AUTOMATED CODE INSIGHT ENGINE — DIAGNOSTIC TELEMETRY</span>
            <span className="text-amber-400 font-semibold text-[11px]">3 Anti-Patterns Flagged</span>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            {/* Diagnostic Row 1 */}
            <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/30 text-[10px] font-bold">
                  LATENCY BOTTLENECK
                </span>
                <span className="text-white font-bold text-sm">
                  ERROR DETECTED: Time Complexity: O(n²) | Recommended: O(n)
                </span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                The inner nested loop executes N iterations over each element, causing timeout on test buffers larger than 100,000 items.
              </p>
            </div>

            {/* Diagnostic Row 2 */}
            <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  PATTERN REGRESSION
                </span>
                <span className="text-white font-bold text-sm">
                  RECURRING PATTERN: Nested-loop solutions appearing across multiple problems.
                </span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Detected across Problem 1 (Array Scan) and Problem 2 (Substring Search). Indicates reliance on brute-force strategies before optimizing.
              </p>
            </div>

            {/* Diagnostic Row 3 */}
            <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-500/30 text-[10px] font-bold">
                  REMEDIATION PRESCRIPTION
                </span>
                <span className="text-white font-bold text-sm">
                  IMPROVEMENT AREA: Algorithmic efficiency and spatial hash indexing.
                </span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Recommended Practice Module: Hash Map Inversion &amp; Two-Pointer Window Traversal (Module NM-P-04).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCodingInsights;
