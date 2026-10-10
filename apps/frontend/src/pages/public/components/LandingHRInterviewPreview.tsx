import React from 'react';

export const LandingHRInterviewPreview: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white" id="hr">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-3">
            ROUND 03 — HR INTERVIEW
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            NOT A FIXED QUESTIONNAIRE.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Engage in a dynamic conversational interview using behavioral, situational, and professional questions.
          </p>
        </div>

        {/* Realistic Conversational Interview Interface with Speech Waveform */}
        <div className="w-full rounded-2xl bg-[#090d14] border border-slate-800 product-elevation overflow-hidden text-slate-300">
          {/* Titlebar */}
          <div className="px-6 py-4 bg-[#05080c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">AI BEHAVIORAL INTERVIEWER — ACTIVE AUDIO SESSION</span>
            </div>
            <div className="flex items-center gap-6 text-[11px]">
              <span className="text-slate-400">Audio Stream: <span className="text-emerald-400 font-bold">48kHz Raw</span></span>
              <span className="text-slate-400">Latency: <span className="text-sky-400 font-bold">16ms</span></span>
            </div>
          </div>

          {/* Dialogue & Transcript Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* Transcript Stream */}
            <div className="lg:col-span-8 p-6 sm:p-8 space-y-6">
              {/* Dialogue 1: AI */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono tracking-wider uppercase text-blue-400 font-bold">
                  AI INTERVIEWER
                </span>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-sans leading-relaxed">
                  &quot;Tell me about a technical problem you recently solved.&quot;
                </div>
              </div>

              {/* Dialogue 2: Candidate */}
              <div className="space-y-1.5 pl-4 sm:pl-8">
                <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-bold">
                  CANDIDATE
                </span>
                <div className="p-4 rounded-xl bg-[#0b1320] border border-blue-500/30 text-white text-xs sm:text-sm font-sans leading-relaxed">
                  &quot;I worked on optimizing a high-throughput event processing pipeline...&quot;
                </div>
              </div>

              {/* Dialogue 3: AI Followup */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono tracking-wider uppercase text-blue-400 font-bold">
                  AI INTERVIEWER
                </span>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-sans leading-relaxed">
                  &quot;What was the main challenge you faced while solving it?&quot;
                </div>
              </div>
            </div>

            {/* Telemetry & STAR Real-time Scoring Panel */}
            <div className="lg:col-span-4 p-6 sm:p-8 bg-[#05080c] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between font-mono text-xs">
              <div className="space-y-6">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold text-[11px] block mb-3">
                    Live Acoustic Waveform
                  </span>
                  {/* Audio waveform visualization */}
                  <div className="flex items-center gap-1.5 h-10 px-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="w-1 bg-emerald-400 h-2 rounded-full animate-pulse" />
                    <div className="w-1 bg-emerald-400 h-4 rounded-full" />
                    <div className="w-1 bg-emerald-400 h-8 rounded-full animate-pulse" />
                    <div className="w-1 bg-emerald-400 h-6 rounded-full" />
                    <div className="w-1 bg-emerald-400 h-9 rounded-full animate-pulse" />
                    <div className="w-1 bg-emerald-400 h-3 rounded-full" />
                    <div className="w-1 bg-emerald-400 h-7 rounded-full animate-pulse" />
                    <div className="w-1 bg-emerald-400 h-5 rounded-full" />
                    <div className="w-1 bg-emerald-400 h-8 rounded-full animate-pulse" />
                    <div className="w-1 bg-emerald-400 h-4 rounded-full" />
                    <div className="w-1 bg-emerald-400 h-2 rounded-full" />
                    <span className="ml-auto text-[10px] text-slate-500 font-sans">Cadence: 134 WPM</span>
                  </div>
                </div>

                {/* STAR Scoring card */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 uppercase font-semibold">STAR Alignment</span>
                    <span className="text-emerald-400 font-bold text-sm">88%</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Candidate clearly articulated Situation and Task. Action items were detailed with measurable Result metrics.
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                    <span>Clarity Index: 92%</span>
                    <span>Tone: Professional</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                Autonomous question progression based on candidate response analysis.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHRInterviewPreview;
