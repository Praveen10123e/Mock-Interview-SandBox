import React from 'react';

interface LandingPracticeDomainsProps {
  onExplorePractice: (category?: string) => void;
}

export const LandingPracticeDomains: React.FC<LandingPracticeDomainsProps> = ({
  onExplorePractice,
}) => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-12 bg-white" id="practice">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-3">
            BEFORE THE MOCK INTERVIEW
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[0.95]">
            PRACTICE BEFORE YOU PERFORM.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Explore technical problem sets and strengthen the skills required for the assessment.
          </p>
        </div>

        {/* Three Authentic Practice Domains */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Domain 1: Aptitude */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 product-elevation flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white font-mono font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">APTITUDE</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Quantitative aptitude, Logical reasoning, Technical aptitude.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-500 pt-2 border-t border-slate-200">
                <li>• Combinatorics &amp; Permutations</li>
                <li>• Syllogisms &amp; Deductive Logic</li>
                <li>• Modular Computer Math</li>
              </ul>
            </div>
            <button
              onClick={() => onExplorePractice('aptitude')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 hover:text-blue-700 font-mono pt-2 text-left"
            >
              <span>EXPLORE PRACTICE</span>
              <span>→</span>
            </button>
          </div>

          {/* Domain 2: Programming */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 product-elevation flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white font-mono font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">PROGRAMMING</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Data structures, Algorithms, Programming problems.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-500 pt-2 border-t border-slate-200">
                <li>• Two Pointers &amp; Sliding Window</li>
                <li>• Binary Trees &amp; Graph Traversals</li>
                <li>• Dynamic Programming &amp; Bit Manipulation</li>
              </ul>
            </div>
            <button
              onClick={() => onExplorePractice('coding')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 hover:text-blue-700 font-mono pt-2 text-left"
            >
              <span>EXPLORE PRACTICE</span>
              <span>→</span>
            </button>
          </div>

          {/* Domain 3: HR */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 product-elevation flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white font-mono font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">HR</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Behavioral questions, Situational questions, Technical communication.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-500 pt-2 border-t border-slate-200">
                <li>• STAR Method Framing Drills</li>
                <li>• Conflict &amp; Priority Tradeoffs</li>
                <li>• Architecture Articulation</li>
              </ul>
            </div>
            <button
              onClick={() => onExplorePractice('hr')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 hover:text-blue-700 font-mono pt-2 text-left"
            >
              <span>EXPLORE PRACTICE</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPracticeDomains;
