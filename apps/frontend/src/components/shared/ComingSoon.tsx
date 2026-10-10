import type { FC } from 'react';
import { EmptyState } from './EmptyState';
import { Rocket } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export const ComingSoon: FC<ComingSoonProps> = ({ 
  title = "Coming Soon", 
  description = "We are currently building this feature. It will be available in an upcoming release."
}) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <EmptyState 
        icon={<Rocket className="h-10 w-10 text-primary animate-pulse" />}
        title={title}
        description={description}
        className="w-full max-w-2xl bg-card"
      />
    </div>
  );
};
