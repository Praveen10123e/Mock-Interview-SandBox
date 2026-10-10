import type { FC } from 'react';
import { Card } from '../../ui/card';
import { GraduationCap, Award } from 'lucide-react';

interface NMProgressWidgetProps {
  nmProfile: any | null;
}

export const NMProgressWidget: FC<NMProgressWidgetProps> = ({ nmProfile }) => {
  if (!nmProfile) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center h-full border-dashed">
        <GraduationCap className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Naan Mudhalvan Profile not linked.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Naan Mudhalvan</h3>
          <p className="text-xs text-muted-foreground">Aligned Track Progress</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">Institution</p>
          <p className="text-sm text-muted-foreground">{nmProfile.institution || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Enrolled Course</p>
          <p className="text-sm text-muted-foreground">{nmProfile.course || 'N/A'}</p>
        </div>
      </div>
    </Card>
  );
};
