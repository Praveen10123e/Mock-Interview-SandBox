import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { motion } from 'framer-motion';
import { BarChart3, Clock, TrendingUp, Trophy } from 'lucide-react';

interface EmptyAnalyticsCardProps {
  title: string;
  description: string;
  icon?: 'chart' | 'clock' | 'trend' | 'trophy';
}

const icons = {
  chart: <BarChart3 className="w-7 h-7 text-indigo-400" />,
  clock: <Clock className="w-7 h-7 text-indigo-400" />,
  trend: <TrendingUp className="w-7 h-7 text-indigo-400" />,
  trophy: <Trophy className="w-7 h-7 text-indigo-400" />,
};

export const EmptyAnalyticsCard: React.FC<EmptyAnalyticsCardProps> = ({
  title,
  description,
  icon = 'chart',
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="mb-3.5 h-12 w-12 rounded-2xl bg-indigo-500/10 ring-1 ring-white/8 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          {icons[icon]}
        </motion.div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Awaiting Data</h3>
        <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};
