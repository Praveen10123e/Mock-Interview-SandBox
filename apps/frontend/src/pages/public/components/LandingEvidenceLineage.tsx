import React from 'react';

export const LandingEvidenceLineage: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-[#f8fafc] border-y border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold block mb-3">
            EVIDENCE-BASED EVALUATION
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            EVERY ROUND LEAVES EVIDENCE.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Assessment results are combined into a structured performance view so candidates can understand their strengths and improvement areas.
          </p>
        </div>

        {/* Visual Data Lineage Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Lineage Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 product-elevation space-y-3 relative group hover:border-slate-400 transition-colors">
            <span className="text-[11px] font-mono uppercase font-bold text-blue-600 tracking-wider">
              SOURCE STREAM 01
            </span>
            <h3 className="text-lg font-bold text-slate-950">APTITUDE</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Answers + Accuracy metrics, response velocity per topic, and cognitive stamina logs.
            </p>
            <div className="pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Telemetry: 30 Questions Answered
            </div>
          </div>

          {/* Lineage Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 product-elevation space-y-3 relative group hover:border-slate-400 transition-colors">
            <span className="text-[11px] font-mono uppercase font-bold text-blue-600 tracking-wider">
              SOURCE STREAM 02
            </span>
            <h3 className="text-lg font-bold text-slate-950">CODING</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Code AST + Test Cases + Execution Metrics (CPU ms, Memory, AST Depth, Complexity).
            </p>
            <div className="pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Telemetry: 3 Test Batches Verified
            </div>
          </div>

          {/* Lineage Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 product-elevation space-y-3 relative group hover:border-slate-400 transition-colors">
            <span className="text-[11px] font-mono uppercase font-bold text-blue-600 tracking-wider">
              SOURCE STREAM 03
            </span>
            <h3 className="text-lg font-bold text-slate-950">HR</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Interview Responses, STAR framework parsing, speech cadence, and contextual adaptability.
            </p>
            <div className="pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Telemetry: 12 Conversation Turns
            </div>
          </div>

          {/* Lineage Output Final */}
          <div className="p-6 rounded-2xl bg-slate-950 text-white product-elevation space-y-3 relative group">
            <span className="text-[11px] font-mono uppercase font-bold text-sky-400 tracking-wider">
              SYNTHESIZED ARTIFACT
            </span>
            <h3 className="text-lg font-bold text-white">FINAL PERFORMANCE REPORT</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unified multi-factor rubric, percentile placement, verified certificates, and prescriptive remediation roadmap.
            </p>
            <div className="pt-3 border-t border-slate-800 font-mono text-[11px] text-emerald-400">
              Status: Ready for Export
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingEvidenceLineage;
