import type { FC } from 'react';
import { Card } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Button } from '../../ui/button';
import { AlertCircle } from 'lucide-react';

interface ProfileCompletionWidgetProps {
  percentage: number;
  missingSections: string[];
}

export const ProfileCompletionWidget: FC<ProfileCompletionWidgetProps> = ({
  percentage,
  missingSections,
}) => {
  return (
    <Card className="p-6 flex flex-col h-full">
      <h3 className="font-semibold text-lg mb-4">Profile Completion</h3>
      <div className="flex items-end gap-4 mb-4">
        <span className="text-4xl font-bold text-primary">{percentage}%</span>
      </div>
      <Progress value={percentage} className="mb-6" />

      {missingSections.length > 0 ? (
        <div className="flex-1">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" /> Missing Sections:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-4">
            {missingSections.slice(0, 3).map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-success">
          Your profile is 100% complete!
        </div>
      )}

      <Button className="w-full mt-auto bg-secondary text-secondary-foreground hover:bg-secondary/80">
        Update Profile
      </Button>
    </Card>
  );
};
