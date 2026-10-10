export class FeatureToggle {
  private static flags: Record<string, boolean> = {
    NEW_INTERVIEW_UI: process.env.FF_NEW_INTERVIEW_UI === 'true',
    AI_SCORING_V2: process.env.FF_AI_SCORING_V2 === 'true',
  };

  static isEnabled(featureName: string): boolean {
    return !!this.flags[featureName];
  }

  static setFlag(featureName: string, value: boolean) {
    this.flags[featureName] = value;
  }
}
