import type { FC } from 'react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { FileWarning } from 'lucide-react';

export const EmptyProfile: FC = () => {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        <FileWarning className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Profile Not Found</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        It looks like you haven't set up your profile yet. Completing your profile is required to
        unlock AI mock interviews.
      </p>
      <Button>Complete Profile</Button>
    </Card>
  );
};

export const EmptyStatistics: FC = () => {
  return (
    <Card className="flex h-[200px] flex-col items-center justify-center p-8 text-center border-dashed">
      <p className="text-sm text-muted-foreground">Complete an interview to generate statistics.</p>
    </Card>
  );
};
