import type { FC, ReactNode } from 'react';

interface FacultyPageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standard shared layout container for all Faculty portal pages.
 * Ensures consistent 100% viewport width utilization, eliminates narrow 1280px / 1100px caps,
 * and maintains unified vertical spacing across all faculty views.
 */
export const FacultyPageContainer: FC<FacultyPageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-none space-y-6 pb-12 min-w-0 ${className}`}>
      {children}
    </div>
  );
};

export default FacultyPageContainer;
