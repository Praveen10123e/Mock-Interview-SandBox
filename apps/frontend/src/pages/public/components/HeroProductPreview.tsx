import type { FC } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Play, Send, ChevronDown } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

export const HeroProductPreview: FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full -mt-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.25 }}
        className="rounded-2xl border border-border-card bg-surface-elevated shadow-2xl overflow-hidden text-left"
      >
        {/* Window Top Navigation Bar */}
        <div className="h-11 bg-surface-deep border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-text-muted ml-2 font-medium">
              Interview Session · Coding Round
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface border border-border text-[11px] font-mono text-text-secondary">
              <span>Python 3 (3.10)</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/25 font-semibold">
              Judge0 Execution Engine
            </span>
          </div>
        </div>

        {/* Window Main Split Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[300px]">
          {/* Left Pane: Problem Description */}
          <div className="p-5 md:p-6 space-y-4 font-sans flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-semibold text-text-primary">
                  1. Reverse Words in a String
                </h3>
                <StatusBadge status="MEDIUM" />
              </div>

              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Given an input string <code className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-primary font-mono text-xs">s</code>, reverse the order of the words. Return a string of the words in reverse order concatenated by a single space.
              </p>

              {/* Sample Case Callout */}
              <div className="bg-surface p-3.5 rounded-xl border border-border-card font-mono text-xs text-text-secondary space-y-1.5 shadow-xs">
                <div>
                  <span className="text-text-muted">Input: </span>
                  <span className="text-text-primary font-semibold">s = "the sky is blue"</span>
                </div>
                <div>
                  <span className="text-text-muted">Output: </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">"blue is sky the"</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs text-text-muted">
              <span>Time Limit: <strong>2000ms</strong></span>
              <span>Memory Limit: <strong>128MB</strong></span>
            </div>
          </div>

          {/* Right Pane: Code Editor Mockup */}
          <div className="p-5 md:p-6 font-mono text-xs text-text-secondary bg-surface-deep flex flex-col justify-between space-y-4">
            {/* Editor Lines */}
            <div className="space-y-1.5 leading-relaxed overflow-x-auto">
              <div className="text-text-muted">// Optimal O(N) Two-Pointer String Reversal</div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">def</span>{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">reverseWords</span>(s: <span className="text-amber-600 dark:text-amber-400">str</span>) -&gt; <span className="text-amber-600 dark:text-amber-400">str</span>:
              </div>
              <div className="pl-4 text-text-primary">
                words = s.strip().split()
              </div>
              <div className="pl-4 text-text-primary">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">return</span>{' '}
                <span className="text-amber-600 dark:text-amber-300">" "</span>.join(reversed(words))
              </div>
            </div>

            {/* Test Results & Execution Footer */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Sample Test Cases Passed (3/3) · 42ms</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" leftIcon={<Play className="h-3 w-3 fill-current" />}>
                  Run Code
                </Button>
                <Button size="sm" leftIcon={<Send className="h-3 w-3" />}>
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroProductPreview;
