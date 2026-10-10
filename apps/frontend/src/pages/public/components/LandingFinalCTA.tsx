import React from 'react';
import { WaterShaderCanvas } from './WaterShaderCanvas';

interface LandingFinalCTAProps {
  onStartMockInterview: () => void;
  onExplorePracticeBank: () => void;
}

export const LandingFinalCTA: React.FC<LandingFinalCTAProps> = ({
  onStartMockInterview,
  onExplorePracticeBank,
}) => {
  return (
    <section
      className="relative py-32 sm:py-44 px-4 sm:px-8 lg:px-12 flex flex-col items-center justify-center text-center overflow-hidden bg-gradient-to-b from-white via-[#f0f7fc] to-[#e4f1fa]"
      id="start"
    >
      {/* Looping Natural Water Shader */}
      <WaterShaderCanvas
        id="cta-water-canvas"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
      />

      <div className="absolute inset-0 bg-white/10 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <p className="text-xs font-mono tracking-[0.25em] text-slate-700 uppercase font-bold">
          YOUR NEXT INTERVIEW STARTS HERE.
        </p>

        <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black text-slate-950 tracking-[-0.03em] leading-[0.9] uppercase">
          PRACTICE. PERFORM.<br />UNDERSTAND. IMPROVE.
        </h2>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
          Experience a structured technical mock interview with automated assessment and multi-factor performance analysis.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartMockInterview}
            className="px-9 py-4 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm tracking-tight transition-transform hover:scale-[1.03] shadow-xl flex items-center gap-2"
          >
            <span>START MOCK INTERVIEW</span>
            <span className="text-xs">→</span>
          </button>
          <button
            onClick={onExplorePracticeBank}
            className="px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-sm tracking-tight transition-all shadow-sm"
          >
            EXPLORE PRACTICE
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingFinalCTA;
