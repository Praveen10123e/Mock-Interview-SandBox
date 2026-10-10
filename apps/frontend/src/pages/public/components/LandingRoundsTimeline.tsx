import React from 'react';

export const LandingRoundsTimeline: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-3">
            THE COMPLETE MOCK INTERVIEW
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            ONE INTERVIEW.<br />THREE ROUNDS. MULTIPLE SIGNALS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            A structured assessment that evaluates technical knowledge, coding ability, and interview communication through separate assessment stages.
          </p>
        </div>

        {/* Single Continuous Horizontal Visual Timeline (Editorial Architecture) */}
        <div className="border-t-2 border-slate-950 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* 01 Aptitude */}
          <div className="relative group">
            <div className="text-5xl sm:text-6xl font-black font-mono text-slate-200 group-hover:text-slate-300 transition-colors mb-4">
              01
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                STAGE 01
              </span>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">APTITUDE</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Quantitative and logical reasoning assessment under strict timed conditions to measure core problem framing.
            </p>
            <div className="mt-4 text-[11px] font-mono text-slate-400">
              Duration: 15 Mins • 30 Questions
            </div>
          </div>

          {/* 02 Coding */}
          <div className="relative group">
            <div className="text-5xl sm:text-6xl font-black font-mono text-slate-200 group-hover:text-slate-300 transition-colors mb-4">
              02
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                STAGE 02
              </span>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">CODING</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Live programming problem solving and code execution inside an isolated container with deterministic test harnesses.
            </p>
            <div className="mt-4 text-[11px] font-mono text-slate-400">
              Duration: 45 Mins • Live Execution
            </div>
          </div>

          {/* 03 HR */}
          <div className="relative group">
            <div className="text-5xl sm:text-6xl font-black font-mono text-slate-200 group-hover:text-slate-300 transition-colors mb-4">
              03
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                STAGE 03
              </span>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">HR</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Dynamic behavioral and situational interview with natural voice synthesis, STAR framework analysis, and audio telemetry.
            </p>
            <div className="mt-4 text-[11px] font-mono text-slate-400">
              Duration: 15 Mins • Speech & STAR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingRoundsTimeline;
