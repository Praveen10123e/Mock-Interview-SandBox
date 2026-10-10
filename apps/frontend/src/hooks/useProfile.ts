import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profile';

export const useProfileCompletion = () => {
  return useQuery({
    queryKey: ['profile', 'completion'],
    queryFn: () => profileApi.getCompletionStatus(),
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
  });
};
