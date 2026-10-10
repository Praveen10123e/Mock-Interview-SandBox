import api from '../../../api/axios/instance';
import type { DashboardDTO } from '../dto/dashboard.dto';

export class DashboardService {
  static async getDashboardData(identityId: string): Promise<DashboardDTO> {
    try {
      // Execute calls in parallel
      const [profileRes, completionRes] = await Promise.allSettled([
        api.get(`/profile/${identityId}`),
        api.get('/profile/me/completion', { headers: { 'x-identity-id': identityId } }),
      ]);

      const summary = profileRes.status === 'fulfilled' ? profileRes.value.data.data : null;
      const completion =
        completionRes.status === 'fulfilled'
          ? completionRes.value.data.data
          : {
              percentage: 0,
              missingSections: ['Profile'],
              suggestions: ['Complete your profile to unlock features.'],
            };

      // Activity and Statistics are mocked as empty arrays/nulls until their respective backend services exist
      // As per instructions: "If backend data is unavailable, display EmptyState components. DO NOT return mock data from API hooks."
      return {
        summary,
        completion,
        activity: [],
        statistics: null,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      throw error;
    }
  }
}
