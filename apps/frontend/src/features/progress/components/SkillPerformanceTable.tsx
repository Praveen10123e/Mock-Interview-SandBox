import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Target, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

export interface SkillMetric {
  name: string;
  category: 'HR Behavioral' | 'Coding Technical' | 'Aptitude & Logic';
  score: number;
  previousScore?: number | null;
  description?: string;
}

interface SkillPerformanceTableProps {
  skills: SkillMetric[];
  hasHistory: boolean;
}

export const SkillPerformanceTable: React.FC<SkillPerformanceTableProps> = ({ skills, hasHistory }) => {
  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden bg-white border border-slate-200/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Skill & Competency Dimension Performance
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative multi-round evaluation metrics evaluated from your latest sessions
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Benchmark: 75% Target</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="py-3 px-4 sm:px-6">Competency Dimension</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Current Score</th>
                <th className="py-3 px-4">Benchmark Progress</th>
                <th className="py-3 px-4 sm:px-6 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {skills.map((skill, index) => {
                let trendIcon = <Minus className="h-3.5 w-3.5 text-slate-400" />;
                let trendText = 'Stable';
                let trendColor = 'text-slate-600 bg-slate-100 border-slate-200';

                if (hasHistory && skill.previousScore !== null && skill.previousScore !== undefined) {
                  const diff = skill.score - skill.previousScore;
                  if (diff > 0) {
                    trendIcon = <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
                    trendText = `+${diff}% Improving`;
                    trendColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  } else if (diff < 0) {
                    trendIcon = <TrendingDown className="h-3.5 w-3.5 text-rose-600" />;
                    trendText = `${diff}% Needs Focus`;
                    trendColor = 'text-rose-700 bg-rose-50 border-rose-200';
                  }
                } else {
                  trendText = 'First evaluation';
                  trendColor = 'text-slate-600 bg-slate-100 border-slate-200';
                }

                const scoreColor =
                  skill.score >= 75
                    ? 'text-emerald-600'
                    : skill.score >= 60
                    ? 'text-amber-600'
                    : 'text-rose-600';

                const progressColor =
                  skill.score >= 75
                    ? 'bg-emerald-500'
                    : skill.score >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{skill.name}</span>
                        {skill.description && (
                          <span className="text-[11px] text-slate-500">{skill.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700 font-medium">
                        {skill.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold text-sm ${scoreColor}`}>
                        {skill.score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, skill.score))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${trendColor}`}>
                        {trendIcon}
                        <span>{trendText}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
