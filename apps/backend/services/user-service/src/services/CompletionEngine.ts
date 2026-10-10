import { Profile } from '../generated/client';

export interface CompletionResult {
  percentage: number;
  missingSections: string[];
  suggestions: string[];
}

export class CompletionEngine {
  public calculateCompletion(profile: any): CompletionResult {
    let score = 0;
    const maxScore = 100;
    const missingSections: string[] = [];
    const suggestions: string[] = [];

    // 1. Basic Info (20%)
    if (profile.firstName && profile.lastName) {
      score += 10;
    } else {
      missingSections.push('Name');
      suggestions.push('Add your full name.');
    }

    if (profile.phone) {
      score += 10;
    } else {
      missingSections.push('Phone Number');
      suggestions.push('Add a phone number to let recruiters contact you.');
    }

    // 2. Education (20%)
    if (profile.education && profile.education.length > 0) {
      score += 20;
    } else {
      missingSections.push('Education');
      suggestions.push('Add your educational background.');
    }

    // 3. Skills (20%)
    if (profile.skills && profile.skills.length > 0) {
      score += 20;
    } else {
      missingSections.push('Skills');
      suggestions.push('Add technical and soft skills to improve your AI interviews.');
    }

    // 4. Resume (15%)
    if (profile.resumes && profile.resumes.length > 0) {
      score += 15;
    } else {
      missingSections.push('Resume');
      suggestions.push('Upload a resume for AI extraction.');
    }

    // 5. Career Profile & AI Preferences (15%)
    if (profile.careerProfile) {
      score += 10;
    } else {
      missingSections.push('Career Profile');
      suggestions.push('Set your career goals for better recommendations.');
    }

    if (profile.aiPreferences) {
      score += 5;
    } else {
      missingSections.push('AI Preferences');
      suggestions.push('Configure how the AI Interviewer should interact with you.');
    }

    // 6. Social Links (10%)
    if (profile.socialLinks && (profile.socialLinks.github || profile.socialLinks.linkedin)) {
      score += 10;
    } else {
      missingSections.push('Social Links');
      suggestions.push('Add GitHub or LinkedIn profiles.');
    }

    return {
      percentage: Math.min(score, maxScore),
      missingSections,
      suggestions,
    };
  }
}
