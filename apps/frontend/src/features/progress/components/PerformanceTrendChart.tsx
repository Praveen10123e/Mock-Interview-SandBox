import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface InterviewProgressPoint {
  id: string;
  interviewNumber: number;
  label: string;
  formattedDate: string;
  overallScore: number;
  aptitudeScore?: number | null;
  codingScore?: number | null;
  hrScore?: number | null;
}

interface PerformanceTrendChartProps {
  data: InterviewProgressPoint[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload as InterviewProgressPoint;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-1.5 min-w-[170px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 font-semibold text-slate-800">
          <span>{point.label}</span>
          <span className="text-[11px] text-slate-500 font-mono">{point.formattedDate}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5">
          <span className="text-slate-600">Overall Score:</span>
          <span className="font-bold text-blue-600 text-sm font-mono">{point.overallScore}/100</span>
        </div>
        {point.aptitudeScore !== null && point.aptitudeScore !== undefined && (
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-600">Aptitude:</span>
            <span className="font-semibold text-sky-600 font-mono">{point.aptitudeScore}%</span>
          </div>
        )}
        {point.codingScore !== null && point.codingScore !== undefined && (
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-600">Coding:</span>
            <span className="font-semibold text-emerald-600 font-mono">{point.codingScore}%</span>
          </div>
        )}
        {point.hrScore !== null && point.hrScore !== undefined && (
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-600">HR Behavioral:</span>
            <span className="font-semibold text-amber-600 font-mono">{point.hrScore}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ data }) => {
  return (
    <Card className="overflow-hidden bg-white border border-slate-200/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-mono">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Overall Interview Progress Trend
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological score trajectory across completed mock interview assessments
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Overall Score (0-100)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="h-[280px] sm:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="overallScore"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGradient)"
                activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
