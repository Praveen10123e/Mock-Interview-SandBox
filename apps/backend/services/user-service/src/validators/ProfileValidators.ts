import { z } from 'zod';

export const UpdateBaseProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
});

export const AddEducationSchema = z.object({
  degree: z.string().min(1, 'Degree is required'),
  institution: z.string().min(1, 'Institution is required'),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  gpa: z.string().optional(),
});

export const AddSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().min(1, 'Category is required'),
  proficiency: z.enum(['Beginner', 'Intermediate', 'Expert']).optional(),
});

export const UpdateCareerProfileSchema = z.object({
  targetRole: z.string().optional(),
  preferredCompanies: z.array(z.string()).optional(),
  expectedSalary: z.string().optional(),
  preferredLocation: z.string().optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  dreamCompany: z.string().optional(),
  interestedDomains: z.array(z.string()).optional(),
  preferredWorkMode: z.enum(['Remote', 'Hybrid', 'Onsite']).optional(),
});

export const UpdateAIPreferencesSchema = z.object({
  interviewStyle: z.string().optional(),
  voiceEnabled: z.boolean().optional(),
  cameraEnabled: z.boolean().optional(),
  aiStrictness: z.number().min(1).max(100).optional(),
  adaptiveDifficulty: z.boolean().optional(),
  stressInjectionEnabled: z.boolean().optional(),
  hintMode: z.boolean().optional(),
  explanationDetailLevel: z.string().optional(),
  preferredVoice: z.string().optional(),
  preferredDuration: z.number().optional(),
});
