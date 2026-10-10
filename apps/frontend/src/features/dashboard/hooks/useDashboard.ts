import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../services/dashboard.service';
import { useAuthStore } from '../../../store/AuthStore';

export const useDashboard = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => DashboardService.getDashboardData(user!.id),
    enabled: !!user?.id, // Only fetch if user exists
    staleTime: 5 * 60 * 1000,
  });
};
