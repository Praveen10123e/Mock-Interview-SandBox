import React, { useState } from 'react';

export const LandingCodingPreview: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white" id="coding">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-3">
            ROUND 02 — LIVE CODING
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            CODE THAT ACTUALLY RUNS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Solve programming problems inside a live coding environment with compilation, execution, test cases, and verdicts.
          </p>
        </div>

        {/* Massive Realistic Coding Environment Visual */}
        <div className="w-full rounded-2xl bg-[#090d14] border border-slate-800 product-elevation overflow-hidden text-slate-300 font-mono">
          {/* Titlebar with language selector & buttons */}
          <div className="px-6 py-4 bg-[#05080c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">Judge0 Isolated Sandbox Jail — Container: j0-worker-production-88</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-300 text-[11px]">
                <span className="text-slate-500">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-white font-mono font-semibold focus:outline-none border-none p-0 text-xs cursor-pointer"
                >
                  <option value="python" className="bg-slate-900">Python 3 (3.11.8)</option>
                  <option value="java" className="bg-slate-900">Java (OpenJDK 17)</option>
                  <option value="cpp" className="bg-slate-900">C++ (GCC 12.2)</option>
                  <option value="go" className="bg-slate-900">Go (1.21)</option>
                </select>
              </div>
              <button className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors">
                Run Code
              </button>
              <button className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors">
                Submit
              </button>
            </div>
          </div>

          {/* Problem & Editor Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left Pane: Problem Spec */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#090d14] text-slate-300 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                  Medium
                </span>
                <span className="text-xs text-slate-500">Time Limit: 2.0s</span>
                <span className="text-xs text-slate-500">Memory: 256MB</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight font-sans">
                Find Longest Substring Without Repeating Characters
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
                Given a string <code className="text-sky-300 font-mono bg-slate-800/60 px-1 py-0.5 rounded">s</code>, find the length of the longest substring without repeating characters.
              </p>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-2">
                <div className="text-slate-500">// Example 1</div>
                <div><span className="text-slate-500">Input: </span>s = &quot;abcabcbb&quot;</div>
                <div className="text-emerald-400"><span className="text-slate-500">Output: </span>3 (Explanation: &quot;abc&quot;)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-2">
                <div className="text-slate-500">// Example 2</div>
                <div><span className="text-slate-500">Input: </span>s = &quot;bbbbb&quot;</div>
                <div className="text-emerald-400"><span className="text-slate-500">Output: </span>1 (Explanation: &quot;b&quot;)</div>
              </div>
            </div>

            {/* Right Pane: Code Editor */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-[#05080c] text-slate-100 flex flex-col justify-between text-xs leading-relaxed">
              <div className="space-y-1 font-mono">
                <div className="text-slate-500 select-none">1  <span className="text-slate-400 italic"># Sliding window technique</span></div>
                <div><span className="text-slate-500 select-none mr-2">2</span><span className="text-purple-400 font-semibold">class</span> <span className="text-yellow-300 font-semibold">Solution</span>:</div>
                <div><span className="text-slate-500 select-none mr-2">3</span>    <span className="text-purple-400 font-semibold">def</span> <span className="text-sky-300 font-semibold">lengthOfLongestSubstring</span>(<span className="text-slate-200">self</span>, <span className="text-sky-200">s</span>: <span className="text-emerald-400">str</span>) -&gt; <span className="text-emerald-400">int</span>:</div>
                <div><span className="text-slate-500 select-none mr-2">4</span>        <span className="text-slate-200">char_set</span> = <span className="text-emerald-400">set</span>()</div>
                <div><span className="text-slate-500 select-none mr-2">5</span>        <span className="text-slate-200">left</span> = <span className="text-amber-300 font-semibold">0</span></div>
                <div><span className="text-slate-500 select-none mr-2">6</span>        <span className="text-slate-200">max_len</span> = <span className="text-amber-300 font-semibold">0</span></div>
                <div><span className="text-slate-500 select-none mr-2">7</span>        <span className="text-purple-400 font-semibold">for</span> <span className="text-slate-200">right</span> <span className="text-purple-400 font-semibold">in</span> <span className="text-sky-300">range</span>(<span className="text-sky-300">len</span>(<span className="text-slate-200">s</span>)):</div>
                <div><span className="text-slate-500 select-none mr-2">8</span>            <span className="text-purple-400 font-semibold">while</span> <span className="text-slate-200">s</span>[<span className="text-slate-200">right</span>] <span className="text-purple-400 font-semibold">in</span> <span className="text-slate-200">char_set</span>:</div>
                <div><span className="text-slate-500 select-none mr-2">9</span>                <span className="text-slate-200">char_set</span>.<span className="text-sky-300">remove</span>(<span className="text-slate-200">s</span>[<span className="text-slate-200">left</span>])</div>
                <div><span className="text-slate-500 select-none mr-2">10</span>               <span className="text-slate-200">left</span> += <span className="text-amber-300 font-semibold">1</span></div>
                <div><span className="text-slate-500 select-none mr-2">11</span>           <span className="text-slate-200">char_set</span>.<span className="text-sky-300">add</span>(<span className="text-slate-200">s</span>[<span className="text-slate-200">right</span>])</div>
                <div><span className="text-slate-500 select-none mr-2">12</span>           <span className="text-slate-200">max_len</span> = <span className="text-sky-300">max</span>(<span className="text-slate-200">max_len</span>, <span className="text-slate-200">right</span> - <span className="text-slate-200">left</span>) <span className="text-amber-300/80 italic"># Bug here: off-by-one</span></div>
                <div><span className="text-slate-500 select-none mr-2">13</span>       <span className="text-purple-400 font-semibold">return</span> <span className="text-slate-200">max_len</span><span className="cursor-blink text-sky-400 font-bold">|</span></div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Encoding: UTF-8</span>
                <span>Tab Size: 4 Spaces</span>
              </div>
            </div>
          </div>

          {/* Execution Output Bar */}
          <div className="p-6 sm:p-8 bg-[#04060a] border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-white font-bold tracking-wider text-xs">TEST CASES</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/40 font-bold">
                VERDICT: FAILED (Exit Code 1)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* TC 1 */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">✓ Test Case 1: PASS</span>
                  <span className="text-slate-400 font-mono text-[11px]">12ms</span>
                </div>
                <div className="text-[11px] text-slate-400">Input: &quot;bbbbb&quot;</div>
                <div className="text-[11px] text-slate-300">Expected: 1 | Output: 1</div>
              </div>

              {/* TC 2 */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">✓ Test Case 2: PASS</span>
                  <span className="text-slate-400 font-mono text-[11px]">24ms</span>
                </div>
                <div className="text-[11px] text-slate-400">Input: &quot;pwwkew&quot;</div>
                <div className="text-[11px] text-slate-300">Expected: 3 | Output: 3</div>
              </div>

              {/* TC 3 Fail */}
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">✕ Test Case 3: FAIL</span>
                  <span className="text-red-400/80 font-mono text-[11px]">31ms</span>
                </div>
                <div className="text-[11px] text-slate-300">Input: &quot;abcabcbb&quot;</div>
                <div className="text-[11px] text-red-300 font-bold">Expected: 15</div>
                <div className="text-[11px] text-amber-300 font-bold">Received: 12</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCodingPreview;
