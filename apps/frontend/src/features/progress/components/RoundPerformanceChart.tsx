import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Layers, Brain, Code2, Users } from 'lucide-react';
import type { InterviewProgressPoint } from './PerformanceTrendChart';

interface RoundPerformanceChartProps {
  data: InterviewProgressPoint[];
}

const RoundTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload as InterviewProgressPoint;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-2 min-w-[170px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1 font-semibold text-slate-800">
          <span>{point.label}</span>
          <span className="text-[11px] text-slate-500 font-mono">{point.formattedDate}</span>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null;
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-800 font-mono">{entry.value}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const RoundPerformanceChart: React.FC<RoundPerformanceChartProps> = ({ data }) => {
  const hasAptitude = data.some((d) => d.aptitudeScore !== null && d.aptitudeScore !== undefined);
  const hasCoding = data.some((d) => d.codingScore !== null && d.codingScore !== undefined);
  const hasHR = data.some((d) => d.hrScore !== null && d.hrScore !== undefined);

  return (
    <Card className="overflow-hidden bg-white border border-slate-200/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Layers className="h-4 w-4 text-blue-600" />
              Round-by-Round Performance Progression
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison across Aptitude, Coding, and HR Behavioral interview stages
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {hasAptitude && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium border border-sky-200">
                <Brain className="h-3 w-3" /> Aptitude
              </span>
            )}
            {hasCoding && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                <Code2 className="h-3 w-3" /> Coding
              </span>
            )}
            {hasHR && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                <Users className="h-3 w-3" /> HR
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="h-[280px] sm:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                dy={4}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<RoundTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => <span className="text-slate-700 font-medium">{value}</span>}
              />
              {hasAptitude && (
                <Line
                  type="monotone"
                  dataKey="aptitudeScore"
                  name="Aptitude Round"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0284c7' }}
                  connectNulls
                />
              )}
              {hasCoding && (
                <Line
                  type="monotone"
                  dataKey="codingScore"
                  name="Coding Round"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#16a34a' }}
                  connectNulls
                />
              )}
              {hasHR && (
                <Line
                  type="monotone"
                  dataKey="hrScore"
                  name="HR Round"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#d97706' }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
