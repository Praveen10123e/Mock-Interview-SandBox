import React, { useState } from 'react';

export const LandingAptitudePreview: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [isFlagged, setIsFlagged] = useState(false);

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-[#f8fafc] border-y border-slate-200" id="aptitude">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold block mb-3">
            ROUND 01 — APTITUDE
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            START WITH THE FUNDAMENTALS.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Solve quantitative, logical, and technical aptitude questions under a structured timed assessment.
          </p>
        </div>

        {/* Realistic Aptitude Application UI */}
        <div className="w-full rounded-2xl bg-white border border-slate-200 product-elevation overflow-hidden">
          {/* Header bar */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">SECTION 01: QUANTITATIVE &amp; LOGICAL REASONING</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Question 14 of 30</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-semibold">Answered: 13/30</span>
              </div>
              <div className="px-3 py-1 rounded-md bg-slate-900 text-white font-bold tracking-wider">
                ⏱ 12:45
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-500 mb-2">
                <span>Overall Progress</span>
                <span>46% Completed</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-950 rounded-full transition-all duration-300" style={{ width: '46.6%' }} />
              </div>
            </div>

            <div className="space-y-4 max-w-4xl">
              <span className="text-xs font-mono text-blue-600 uppercase font-bold tracking-wider">
                Topic: Probabilistic Combinatorics &amp; Modular Arithmetic
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                A distributed hash ring with 12 distinct validator nodes uses modular hashing key % 12. If 3 specific nodes fail simultaneously at random, what is the probability that at least two consecutive node positions in the ring remain active without partition?
              </h3>
            </div>

            {/* Multiple Choice Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              {/* Option A */}
              <div
                onClick={() => setSelectedOption('A')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedOption === 'A'
                    ? 'border-2 border-slate-900 bg-slate-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      selectedOption === 'A'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-300 text-slate-500'
                    }`}
                  >
                    A
                  </span>
                  <span className={`text-xs sm:text-sm ${selectedOption === 'A' ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}`}>
                    19 / 22 (≈ 86.3%)
                  </span>
                </div>
                <input
                  type="radio"
                  name="apt_preview"
                  checked={selectedOption === 'A'}
                  onChange={() => setSelectedOption('A')}
                  className="text-slate-900 focus:ring-0"
                />
              </div>

              {/* Option B */}
              <div
                onClick={() => setSelectedOption('B')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedOption === 'B'
                    ? 'border-2 border-slate-900 bg-slate-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      selectedOption === 'B'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-300 text-slate-500'
                    }`}
                  >
                    B
                  </span>
                  <span className={`text-xs sm:text-sm ${selectedOption === 'B' ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}`}>
                    21 / 22 (≈ 95.4%)
                  </span>
                </div>
                <input
                  type="radio"
                  name="apt_preview"
                  checked={selectedOption === 'B'}
                  onChange={() => setSelectedOption('B')}
                  className="text-slate-900 focus:ring-0"
                />
              </div>

              {/* Option C */}
              <div
                onClick={() => setSelectedOption('C')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedOption === 'C'
                    ? 'border-2 border-slate-900 bg-slate-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      selectedOption === 'C'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-300 text-slate-500'
                    }`}
                  >
                    C
                  </span>
                  <span className={`text-xs sm:text-sm ${selectedOption === 'C' ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}`}>
                    17 / 22 (≈ 77.2%)
                  </span>
                </div>
                <input
                  type="radio"
                  name="apt_preview"
                  checked={selectedOption === 'C'}
                  onChange={() => setSelectedOption('C')}
                  className="text-slate-900 focus:ring-0"
                />
              </div>

              {/* Option D */}
              <div
                onClick={() => setSelectedOption('D')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedOption === 'D'
                    ? 'border-2 border-slate-900 bg-slate-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      selectedOption === 'D'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-300 text-slate-500'
                    }`}
                  >
                    D
                  </span>
                  <span className={`text-xs sm:text-sm ${selectedOption === 'D' ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}`}>
                    7 / 11 (≈ 63.6%)
                  </span>
                </div>
                <input
                  type="radio"
                  name="apt_preview"
                  checked={selectedOption === 'D'}
                  onChange={() => setSelectedOption('D')}
                  className="text-slate-900 focus:ring-0"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setIsFlagged(!isFlagged)}
                className={`px-4 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                  isFlagged
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-slate-300 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {isFlagged ? '★ Flagged for Review' : 'Flag for Review'}
              </button>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-mono font-semibold text-slate-700 transition-colors">
                  ← Previous
                </button>
                <button className="px-5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-all shadow-sm">
                  Next Question →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingAptitudePreview;
