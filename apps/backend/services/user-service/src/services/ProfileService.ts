import { BaseService } from '@nm/api-base';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { CompletionEngine } from './CompletionEngine';
import { ErrorFactory } from '@nm/errors';
import { Prisma } from '../generated/client';

export class ProfileService extends BaseService {
  private profileRepo: ProfileRepository;
  private completionEngine: CompletionEngine;

  constructor() {
    super('ProfileService');
    this.profileRepo = new ProfileRepository();
    this.completionEngine = new CompletionEngine();
  }

  public async createProfile(data: {
    identityId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    let profile = await this.profileRepo.findByIdentityId(data.identityId);
    if (profile) {
      // If profile already exists, update missing fields
      const updateData: Prisma.ProfileUpdateInput = {};
      if (data.firstName && (!profile.firstName || profile.firstName === 'New')) {
        updateData.firstName = data.firstName;
      }
      if (data.lastName && (!profile.lastName || profile.lastName === 'User')) {
        updateData.lastName = data.lastName;
      }
      if (Object.keys(updateData).length > 0) {
        await this.profileRepo.update(profile.id, updateData);
        profile = await this.profileRepo.findByIdentityId(data.identityId);
      }
      return profile;
    }

    let first = (data.firstName || '').trim();
    let last = (data.lastName || '').trim();

    if (!first && data.email) {
      const parsed = this.parseNamesFromEmail(data.email);
      first = parsed.firstName;
      last = parsed.lastName;
    }

    profile = (await this.profileRepo.create({
      identityId: data.identityId,
      firstName: first || 'New',
      lastName: last || 'User',
    })) as any;

    return this.profileRepo.findByIdentityId(data.identityId);
  }

  private parseNamesFromEmail(email?: string): { firstName: string; lastName: string } {
    if (!email || !email.includes('@')) return { firstName: '', lastName: '' };
    const prefix = email.split('@')[0];
    const parts = prefix.split(/[._-]/).filter((p) => p && !/^\d+$/.test(p));
    if (parts.length === 0) return { firstName: '', lastName: '' };

    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const lastName =
      parts.length > 1
        ? parts
            .slice(1)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ')
        : '';

    return { firstName, lastName };
  }

  public async getProfileByIdentityId(identityId: string, userEmail?: string) {
    let profile = await this.profileRepo.findByIdentityId(identityId);
    if (!profile) {
      const parsed = this.parseNamesFromEmail(userEmail);
      profile = (await this.profileRepo.create({
        identityId,
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
      })) as any;
      profile = await this.profileRepo.findByIdentityId(identityId);
    } else if (
      (profile.firstName === 'New' && profile.lastName === 'User') ||
      (!profile.firstName && !profile.lastName)
    ) {
      // Self-heal existing profiles that were lazy-created with dummy "New User" strings
      if (userEmail) {
        const parsed = this.parseNamesFromEmail(userEmail);
        if (parsed.firstName) {
          await this.profileRepo.update(profile.id, {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
          });
          profile = await this.profileRepo.findByIdentityId(identityId);
        }
      }
    }
    return profile;
  }

  public async updateProfileBase(
    identityId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      college?: string;
      department?: string;
      batch?: string;
    },
  ) {
    const profile = await this.profileRepo.findByIdentityId(identityId);
    if (!profile) throw ErrorFactory.notFound('Profile not found');

    const { firstName, lastName, phone, avatarUrl, college, department, batch } = data;

    const updateData: Prisma.ProfileUpdateInput = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (college !== undefined || department !== undefined || batch !== undefined) {
      updateData.studentProfile = {
        upsert: {
          create: {
            college: college || null,
            department: department || null,
            batch: batch || null,
          },
          update: {
            ...(college !== undefined && { college }),
            ...(department !== undefined && { department }),
            ...(batch !== undefined && { batch }),
          },
        },
      };
    }

    const updated = await this.profileRepo.update(profile.id, updateData);

    // Recalculate Completion async
    this.triggerCompletionRecalculation(identityId).catch((err) =>
      this.logger.error('Completion recalculation failed', err),
    );

    return this.profileRepo.findByIdentityId(identityId);
  }

  public async updatePreferences(
    identityId: string,
    data: { preferredProgrammingLanguage?: string },
  ) {
    const profile = await this.profileRepo.findByIdentityId(identityId);
    if (!profile) throw ErrorFactory.notFound('Profile not found');

    const updateData: Prisma.ProfileUpdateInput = {
      interviewPreference: {
        upsert: {
          create: {
            preferredProgrammingLanguage: data.preferredProgrammingLanguage || 'python',
          },
          update: {
            ...(data.preferredProgrammingLanguage && {
              preferredProgrammingLanguage: data.preferredProgrammingLanguage,
            }),
          },
        },
      },
    };

    await this.profileRepo.update(profile.id, updateData);
    return this.profileRepo.findByIdentityId(identityId);
  }

  public async getCodingStats(identityId: string) {
    const profile = (await this.profileRepo.findByIdentityId(identityId)) as any;
    if (!profile) throw ErrorFactory.notFound('Profile not found');

    const preferredLanguage =
      profile.interviewPreference?.preferredProgrammingLanguage || 'python';

    // Check if we can fetch execution stats from interview-service or internal metrics
    const interviewCount = profile.metrics?.interviewCount || 0;

    return {
      problemsSolved: 0,
      totalSubmissions: 0,
      acceptanceRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      preferredLanguage,
      interviewCount,
      hasEnoughData: false, // Explicit indicator for "Not enough assessment data" as per prompt
    };
  }

  public async triggerCompletionRecalculation(identityId: string) {
    const profile = await this.profileRepo.findByIdentityId(identityId);
    if (!profile) return;

    const result = this.completionEngine.calculateCompletion(profile);

    if (profile.completionPercentage !== result.percentage) {
      await this.profileRepo.update(profile.id, { completionPercentage: result.percentage });
    }
  }

  public async getCompletionStatus(identityId: string) {
    const profile = await this.profileRepo.findByIdentityId(identityId);
    if (!profile) throw ErrorFactory.notFound('Profile not found');
    return this.completionEngine.calculateCompletion(profile);
  }
}
