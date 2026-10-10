import type { FC } from 'react';
import { Card } from '../../ui/card';
import { Play, Code, FileText, Upload } from 'lucide-react';

export const QuickActionsWidget: FC = () => {
  const actions = [
    { name: 'Start Interview', icon: Play, disabled: true },
    { name: 'Practice Coding', icon: Code, disabled: true },
    { name: 'Update Profile', icon: FileText, disabled: false },
    { name: 'Upload Resume', icon: Upload, disabled: false },
  ];

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <button
            key={action.name}
            className={`group relative flex flex-col items-center justify-center p-4 rounded-xl border border-border transition-all ${
              action.disabled
                ? 'opacity-50 cursor-not-allowed bg-muted/20'
                : 'hover:bg-secondary hover:border-primary/50 cursor-pointer'
            }`}
          >
            <action.icon
              className={`h-8 w-8 mb-2 ${action.disabled ? 'text-muted-foreground' : 'text-primary'}`}
            />
            <span className="text-sm font-medium text-center">{action.name}</span>
            {action.disabled && (
              <span className="absolute -top-10 hidden whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block z-50">
                Coming Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
};
