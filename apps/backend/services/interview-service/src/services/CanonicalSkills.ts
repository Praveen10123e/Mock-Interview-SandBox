/**
 * CanonicalSkills.ts
 *
 * Canonical skill registry ensuring consistent skill identity across:
 * - Phase 5: Interview Autopsy
 * - Phase 6: Interview DNA
 * - Phase 7: Personalized Improvement Loop, Practice Tasks, and Reassessment
 */

export const CANONICAL_SKILLS = {
  // Coding Technical Competencies
  CODING_BOUNDARY: 'coding.boundary_handling',
  CODING_EFFICIENCY: 'coding.algorithmic_efficiency',
  CODING_HYGIENE: 'coding.code_hygiene',
  CODING_LOGIC: 'coding.algorithmic_logic',

  // HR Behavioral 8 Authorized Dimensions & Sub-competencies
  HR_TECHNICAL_DEPTH: 'hr.technical_depth',
  HR_TECHNICAL_EVIDENCE: 'hr.technical_evidence',
  HR_STAR_RESULT: 'hr.star_result',
  HR_STRUCTURE: 'hr.structure',
  HR_SPECIFICITY: 'hr.specificity',
  HR_EVIDENCE: 'hr.evidence',
  HR_RELEVANCE: 'hr.relevance',
  HR_CLARITY: 'hr.clarity',
  HR_OWNERSHIP: 'hr.ownership',
  HR_PROFESSIONALISM: 'hr.professionalism',

  // Cross-Round Synthesis Competencies
  CROSS_ROUND_TECH_DEPTH: 'cross_round.technical_depth',
  CROSS_ROUND_TIME_MANAGEMENT: 'cross_round.time_management',
} as const;

/**
 * Normalizes any category / raw skill key or title into an authoritative canonical skill ID.
 */
export function toCanonicalSkillId(category: string, rawKeyOrTitle: string): string {
  const norm = (rawKeyOrTitle || '').toLowerCase().trim();

  // If already a recognized canonical ID format, return directly
  if (norm === 'coding.boundary_handling' || norm === 'coding.boundary') return CANONICAL_SKILLS.CODING_BOUNDARY;
  if (norm === 'coding.algorithmic_efficiency' || norm === 'coding.efficiency') return CANONICAL_SKILLS.CODING_EFFICIENCY;
  if (norm === 'coding.code_hygiene' || norm === 'coding.hygiene') return CANONICAL_SKILLS.CODING_HYGIENE;
  if (norm === 'coding.algorithmic_logic' || norm === 'coding.logic') return CANONICAL_SKILLS.CODING_LOGIC;
  if (norm === 'hr.technical_evidence') return CANONICAL_SKILLS.HR_TECHNICAL_EVIDENCE;
  if (norm === 'hr.technical_depth') return CANONICAL_SKILLS.HR_TECHNICAL_DEPTH;
  if (norm === 'hr.star_result') return CANONICAL_SKILLS.HR_STAR_RESULT;
  if (norm === 'hr.structure') return CANONICAL_SKILLS.HR_STRUCTURE;
  if (norm === 'hr.specificity') return CANONICAL_SKILLS.HR_SPECIFICITY;
  if (norm === 'hr.evidence') return CANONICAL_SKILLS.HR_EVIDENCE;
  if (norm === 'hr.relevance') return CANONICAL_SKILLS.HR_RELEVANCE;
  if (norm === 'hr.clarity') return CANONICAL_SKILLS.HR_CLARITY;
  if (norm === 'hr.ownership') return CANONICAL_SKILLS.HR_OWNERSHIP;
  if (norm === 'hr.professionalism') return CANONICAL_SKILLS.HR_PROFESSIONALISM;
  if (norm === 'aptitude.percentages') return 'aptitude.percentages';

  // Coding mappings
  if (category === 'CODING' || norm.startsWith('coding')) {
    if (norm.includes('edge') || norm.includes('boundary') || norm.includes('corner')) {
      return CANONICAL_SKILLS.CODING_BOUNDARY;
    }
    if (norm.includes('timeout') || norm.includes('efficiency') || norm.includes('complexity') || norm.includes('optimal')) {
      return CANONICAL_SKILLS.CODING_EFFICIENCY;
    }
    if (norm.includes('compilation') || norm.includes('syntax') || norm.includes('hygiene')) {
      return CANONICAL_SKILLS.CODING_HYGIENE;
    }
    return CANONICAL_SKILLS.CODING_LOGIC;
  }

  // HR Behavioral mappings
  if (category === 'HR' || norm.startsWith('hr')) {
    if (norm.includes('star_result') || norm.includes('result') || norm.includes('missing_star')) {
      return CANONICAL_SKILLS.HR_STAR_RESULT;
    }
    if (norm.includes('technical_evidence') || (norm.includes('technical') && norm.includes('evidence'))) {
      return CANONICAL_SKILLS.HR_TECHNICAL_EVIDENCE;
    }
    if (norm.includes('technical_depth') || norm.includes('depth') || norm.includes('technical')) {
      return CANONICAL_SKILLS.HR_TECHNICAL_DEPTH;
    }
    if (norm.includes('specificity') || norm.includes('concrete')) {
      return CANONICAL_SKILLS.HR_SPECIFICITY;
    }
    if (norm.includes('structure') || norm.includes('coherence')) {
      return CANONICAL_SKILLS.HR_STRUCTURE;
    }
    if (norm.includes('evidence')) {
      return CANONICAL_SKILLS.HR_EVIDENCE;
    }
    if (norm.includes('relevance')) {
      return CANONICAL_SKILLS.HR_RELEVANCE;
    }
    if (norm.includes('clarity') || norm.includes('conciseness')) {
      return CANONICAL_SKILLS.HR_CLARITY;
    }
    if (norm.includes('ownership') || norm.includes('initiative')) {
      return CANONICAL_SKILLS.HR_OWNERSHIP;
    }
    if (norm.includes('professionalism') || norm.includes('poise')) {
      return CANONICAL_SKILLS.HR_PROFESSIONALISM;
    }
    return CANONICAL_SKILLS.HR_EVIDENCE;
  }

  // Aptitude mappings
  if (category === 'APTITUDE' || norm.startsWith('aptitude')) {
    const topic = norm
      .replace('aptitude topic accuracy:', '')
      .replace('aptitude_', '')
      .replace('aptitude.', '')
      .replace('quantitative & analytical reasoning', 'general')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');
    return topic === 'percentages' ? 'aptitude.percentages' : `aptitude.quantitative.${topic || 'general'}`;
  }

  // Cross-Round mappings
  if (category === 'CROSS_ROUND' || norm.startsWith('cross_round') || norm.startsWith('cr-')) {
    if (norm.includes('depth') || norm.includes('tech')) {
      return CANONICAL_SKILLS.CROSS_ROUND_TECH_DEPTH;
    }
    if (norm.includes('time') || norm.includes('pacing')) {
      return CANONICAL_SKILLS.CROSS_ROUND_TIME_MANAGEMENT;
    }
    return `cross_round.${norm.replace(/[^a-z0-9]/g, '_')}`;
  }

  return `general.${norm.replace(/[^a-z0-9]/g, '_')}`;
}
