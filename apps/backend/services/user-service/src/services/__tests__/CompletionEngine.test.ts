import { describe, it, expect, beforeAll } from 'vitest';
import { CompletionEngine } from '../CompletionEngine';

describe('CompletionEngine', () => {
  let completionEngine: CompletionEngine;

  beforeAll(() => {
    completionEngine = new CompletionEngine();
  });

  it('should calculate 0% for an empty profile', () => {
    const result = completionEngine.calculateCompletion({});
    expect(result.percentage).toBe(0);
    expect(result.missingSections).toContain('Name');
    expect(result.missingSections).toContain('Education');
  });

  it('should calculate 100% for a fully populated profile', () => {
    const profile = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
      education: [{}],
      skills: [{}],
      resumes: [{}],
      careerProfile: {},
      aiPreferences: {},
      socialLinks: { github: 'https://github.com/johndoe' },
    };

    const result = completionEngine.calculateCompletion(profile);
    expect(result.percentage).toBe(100);
    expect(result.missingSections.length).toBe(0);
  });
});
