import React from 'react';
import { WaterShaderCanvas } from './WaterShaderCanvas';

interface LandingHeroProps {
  onStartMockInterview: () => void;
  onExplorePracticeBank: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartMockInterview,
  onExplorePracticeBank,
}) => {
  return (
    <section className="relative min-h-screen pt-32 pb-24 px-4 sm:px-8 lg:px-12 flex flex-col items-center justify-start overflow-hidden bg-gradient-to-b from-[#eef7fd] via-[#f8fafc] to-white">
      {/* Looping Natural Falling Water Surface Caustics */}
      <WaterShaderCanvas id="hero-water-canvas" className="absolute inset-0 w-full h-full pointer-events-none opacity-90" />

      {/* Subtle Translucent Film Layer for Crisp Typographic Contrast */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />

      {/* Ambient Canvas Mesh Backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1200px] h-[750px] bg-gradient-to-tr from-sky-200/35 via-blue-100/25 to-indigo-100/15 rounded-full blur-[140px] opacity-70" />
        <div className="absolute top-[40%] -left-[10%] w-[800px] h-[600px] bg-gradient-to-r from-cyan-100/30 to-blue-200/20 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[70%] -right-[15%] w-[900px] h-[700px] bg-gradient-to-l from-sky-100/35 via-blue-50/20 to-transparent rounded-full blur-[130px] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.14]" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center text-center pt-6 sm:pt-10">
        <p className="text-[11px] sm:text-xs font-mono tracking-[0.25em] text-slate-700 uppercase font-bold mb-6">
          NAAN MUDHALVAN • AUTOMATED TECHNICAL ASSESSMENT
        </p>

        {/* Monumental Typography */}
        <h1 className="text-4xl sm:text-7xl lg:text-[5.5rem] font-black text-slate-950 tracking-[-0.04em] leading-[0.92] max-w-6xl mx-auto uppercase">
          YOUR INTERVIEW.<br />
          SIMULATED FOR REAL.
        </h1>

        <p className="mt-8 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          Practice complete technical interviews with Aptitude, Coding, and HR rounds — then understand exactly where you can improve with automated multi-factor scoring.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-5 z-20">
          <button
            onClick={onStartMockInterview}
            className="px-8 py-3.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm tracking-tight transition-transform hover:scale-[1.02] shadow-lg flex items-center gap-2"
          >
            <span>START MOCK INTERVIEW</span>
            <span className="text-xs">→</span>
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else onExplorePracticeBank();
            }}
            className="px-7 py-3.5 rounded-full bg-white/95 hover:bg-white text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm tracking-tight transition-all shadow-sm"
          >
            EXPLORE PLATFORM
          </a>
        </div>

        {/* Small Capabilities Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-mono text-slate-500 font-medium">
          <span>Aptitude Assessment</span>
          <span className="text-slate-300">•</span>
          <span>Live Coding</span>
          <span className="text-slate-300">•</span>
          <span>Dynamic HR</span>
          <span className="text-slate-300">•</span>
          <span>Multi-Factor Scoring</span>
        </div>

        {/* Floating Product Preview Emerging Over Water Surface */}
        <div className="mt-14 sm:mt-20 w-full hero-perspective">
          <div className="hero-app-emerge w-full rounded-2xl bg-[#080d15] border border-slate-700/60 product-elevation-hero text-left overflow-hidden">
            {/* Application Bar */}
            <div className="px-5 py-3.5 bg-[#05080e] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-slate-300 font-semibold tracking-wider uppercase ml-2 text-[11px]">
                  INTERVIEW SESSION — ROUND 2 / 3 — LIVE CODING
                </span>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-emerald-400 font-mono text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Focus: Locked Active
                </span>
                <div className="px-2.5 py-1 rounded bg-slate-800/90 text-slate-200 text-xs font-mono font-bold tracking-wider">
                  ⏱ 24:18
                </div>
              </div>
            </div>

            {/* Inner Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
              {/* Problem Spec */}
              <div className="lg:col-span-5 p-6 sm:p-7 bg-[#080d15] text-slate-300 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-sky-300 border border-blue-500/30 font-semibold">
                    Algorithms
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">NM-CODING-02</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Two Sum Array Pointers</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                  Given a 1-indexed sorted integer array <code className="text-sky-300 font-mono bg-slate-800/60 px-1 py-0.5 rounded">numbers</code> and an integer <code className="text-sky-300 font-mono bg-slate-800/60 px-1 py-0.5 rounded">target</code>, return the indices of the two numbers such that they add up to the target. Your algorithm must use <code className="text-sky-300 font-mono">O(1)</code> additional space.
                </p>

                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    Unit Verification Test Harness
                  </span>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">✓ Test Case 1</span>
                      <span className="text-slate-400 text-[11px]">numbers = [2,7,11,15], target = 9</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">✓ Test Case 2</span>
                      <span className="text-slate-400 text-[11px]">numbers = [2,3,4], target = 6</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">✓ Test Case 3</span>
                      <span className="text-slate-400 text-[11px]">numbers = [-1,0], target = -1</span>
                    </div>
                  </div>
                </div>

                {/* Execution stats badges */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-center font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Runtime</span>
                    <span className="text-sm font-bold text-white">42 ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Memory</span>
                    <span className="text-sm font-bold text-sky-400">128 MB</span>
                  </div>
                </div>
              </div>

              {/* Code Editor Pane */}
              <div className="lg:col-span-7 p-6 sm:p-7 bg-[#05080c] text-slate-100 flex flex-col justify-between font-mono text-xs leading-relaxed">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                    <span className="text-slate-200 font-semibold">solution.py</span>
                    <span className="text-slate-400">Python 3.11</span>
                  </div>
                  <div className="text-slate-500 select-none">1  <span className="text-slate-400 italic"># Two-pointer linear scan with O(1) space</span></div>
                  <div><span className="text-slate-500 select-none mr-2">2</span><span className="text-purple-400 font-semibold">def</span> <span className="text-sky-300 font-semibold">twoSum</span>(<span className="text-sky-200">numbers</span>: <span className="text-emerald-400">list</span>[<span className="text-emerald-400">int</span>], <span className="text-sky-200">target</span>: <span className="text-emerald-400">int</span>) -&gt; <span className="text-emerald-400">list</span>[<span className="text-emerald-400">int</span>]:</div>
                  <div><span className="text-slate-500 select-none mr-2">3</span>    <span className="text-slate-200">left</span>, <span className="text-slate-200">right</span> = <span className="text-amber-300 font-semibold">0</span>, <span className="text-sky-300">len</span>(<span className="text-slate-200">numbers</span>) - <span className="text-amber-300 font-semibold">1</span></div>
                  <div><span className="text-slate-500 select-none mr-2">4</span>    <span className="text-purple-400 font-semibold">while</span> <span className="text-slate-200">left</span> &lt; <span className="text-slate-200">right</span>:</div>
                  <div><span className="text-slate-500 select-none mr-2">5</span>        <span className="text-slate-200">current_sum</span> = <span className="text-slate-200">numbers</span>[<span className="text-slate-200">left</span>] + <span className="text-slate-200">numbers</span>[<span className="text-slate-200">right</span>]</div>
                  <div><span className="text-slate-500 select-none mr-2">6</span>        <span className="text-purple-400 font-semibold">if</span> <span className="text-slate-200">current_sum</span> == <span className="text-slate-200">target</span>:</div>
                  <div><span className="text-slate-500 select-none mr-2">7</span>            <span className="text-purple-400 font-semibold">return</span> [<span className="text-slate-200">left</span> + <span className="text-amber-300 font-semibold">1</span>, <span className="text-slate-200">right</span> + <span className="text-amber-300 font-semibold">1</span>]</div>
                  <div><span className="text-slate-500 select-none mr-2">8</span>        <span className="text-purple-400 font-semibold">elif</span> <span className="text-slate-200">current_sum</span> &lt; <span className="text-slate-200">target</span>:</div>
                  <div><span className="text-slate-500 select-none mr-2">9</span>            <span className="text-slate-200">left</span> += <span className="text-amber-300 font-semibold">1</span></div>
                  <div><span className="text-slate-500 select-none mr-2">10</span>       <span className="text-purple-400 font-semibold">else</span>:</div>
                  <div><span className="text-slate-500 select-none mr-2">11</span>           <span className="text-slate-200">right</span> -= <span className="text-amber-300 font-semibold">1</span></div>
                  <div><span className="text-slate-500 select-none mr-2">12</span>   <span className="text-purple-400 font-semibold">return</span> []<span className="cursor-blink text-sky-400 font-bold">|</span></div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">
                    Sandbox Status: <span className="text-emerald-400 font-semibold">Active & Ready</span>
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={onStartMockInterview}
                      className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                    >
                      Run Code
                    </button>
                    <button
                      onClick={onStartMockInterview}
                      className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
                    >
                      Submit Solution →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
