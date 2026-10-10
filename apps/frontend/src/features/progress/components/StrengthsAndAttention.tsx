import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';

interface StrengthArea {
  title: string;
  metric?: string;
  detail: string;
}

interface AttentionArea {
  title: string;
  metric?: string;
  detail: string;
  actionRoute?: string;
  actionLabel?: string;
}

interface StrengthsAndAttentionProps {
  strengths: StrengthArea[];
  attentionAreas: AttentionArea[];
}

export const StrengthsAndAttention: React.FC<StrengthsAndAttentionProps> = ({
  strengths,
  attentionAreas,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* ── Your Strongest Areas ── */}
      <Card className="bg-white border border-emerald-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3 border-b border-emerald-100 bg-emerald-50/50">
            <CardTitle className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2 font-mono">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Your Strongest Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {strengths && strengths.length > 0 ? (
              strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 shadow-2xs"
                >
                  <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      {item.metric && (
                        <span className="text-[11px] font-mono font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Complete a multi-round mock interview to identify your peak competency strengths.
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* ── Areas Needing Attention ── */}
      <Card className="bg-white border border-amber-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/50">
            <CardTitle className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2 font-mono">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              Areas Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {attentionAreas && attentionAreas.length > 0 ? (
              attentionAreas.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 shadow-2xs"
                >
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    !
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      {item.metric && (
                        <span className="text-[11px] font-mono font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-100 border border-amber-200">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                    {item.actionRoute && (
                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(item.actionRoute!)}
                          className="text-[11px] h-7 gap-1 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-medium"
                        >
                          {item.actionLabel || 'Targeted Practice'}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                No acute weaknesses detected. Complete regular mock assessments to maintain calibration.
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
};
