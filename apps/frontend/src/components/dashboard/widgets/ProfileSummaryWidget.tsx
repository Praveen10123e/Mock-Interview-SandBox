import type { FC } from 'react';
import { Card } from '../../ui/card';
import type { ProfileSummaryDTO } from '../../../features/dashboard/dto/dashboard.dto';
import { MapPin, Briefcase } from 'lucide-react';

interface ProfileSummaryWidgetProps {
  summary: ProfileSummaryDTO;
}

export const ProfileSummaryWidget: FC<ProfileSummaryWidgetProps> = ({ summary }) => {
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold text-primary flex-shrink-0">
          {summary.firstName ? summary.firstName.charAt(0) : 'U'}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {summary.firstName} {summary.lastName}
          </h2>

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {summary.careerProfile?.targetRole && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> {summary.careerProfile.targetRole}
              </span>
            )}
            {summary.careerProfile?.preferredLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {summary.careerProfile.preferredLocation}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {summary.skills?.slice(0, 5).map((skill: any) => (
              <span
                key={skill.id}
                className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md"
              >
                {skill.skill.name}
              </span>
            ))}
            {summary.skills?.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No skills added yet</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
