import React from 'react';
import { NMSandboxLogo } from './NMSandboxLogo';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="w-full py-16 px-6 sm:px-12 bg-white border-t border-slate-200 text-slate-500 font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-baseline justify-between gap-8">
        <div className="space-y-2">
          <div className="text-slate-950 font-bold text-base flex items-center gap-2.5">
            <NMSandboxLogo size={24} />
            <span>NM Sandbox</span>
          </div>
          <p className="font-sans text-xs text-slate-500 max-w-md leading-relaxed">
            Naan Mudhalvan Aligned Automated Technical Mock Interview Sandbox with Multi-Factor Coding Proficiency Metric Scoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-xs font-sans">
          <a className="hover:text-slate-950 transition-colors" href="#how-it-works">
            How It Works
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#aptitude">
            Assessment
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#practice">
            Practice
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#reports">
            Reports
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#start">
            Start
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-400">
        <div>© 2025 Naan Mudhalvan Technical Platform. Government of Tamil Nadu.</div>
        <div>Judge0 v1.13.0 API Attached · Sandbox Latency: 18ms</div>
      </div>
    </footer>
  );
};

export default LandingFooter;
