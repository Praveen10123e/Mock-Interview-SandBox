import type { FC } from 'react';
import { Card } from '../../ui/card';
import { useAuthStore } from '../../../store/AuthStore';
import { useProfile } from '../../../hooks/useProfile';

interface WelcomeWidgetProps {
  percentage?: number;
}

export const WelcomeWidget: FC<WelcomeWidgetProps> = () => {
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useProfile();

  const rawFirst = (profile?.firstName || user?.firstName || '').trim();
  const rawLast = (profile?.lastName || user?.lastName || '').trim();
  const first = (rawFirst === 'New' && rawLast === 'User') ? '' : rawFirst;
  const last = (rawFirst === 'New' && rawLast === 'User') ? '' : rawLast;

  const combinedName = [first, last].filter(Boolean).join(' ');
  const emailPrefixName = user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : '';
  const formattedEmailName = emailPrefixName
    .split(' ')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const displayName = combinedName || user?.name || formattedEmailName || 'Candidate';

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/10 via-card to-card">
      <h2 className="text-2xl font-bold mb-2">Welcome back, {displayName}!</h2>
      <p className="text-muted-foreground mb-4">
        Ready to ace your next technical interview? Keep pushing forward!
      </p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Today's Goal: Complete an AI Mock Interview</p>
        </div>
      </div>
    </Card>
  );
};
