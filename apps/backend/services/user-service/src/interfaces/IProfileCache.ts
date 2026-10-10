import { Profile } from '../generated/client';

export interface IProfileCache {
  getProfile(identityId: string): Promise<Profile | null>;
  setProfile(identityId: string, profile: Profile, ttlSeconds?: number): Promise<void>;
  invalidateProfile(identityId: string): Promise<void>;
}
