/**
 * HRTranscriptValidator.ts — Context-Aware Transcript Verification & Evidence Validation
 *
 * Implements Feature A:
 * 1. Preserves rawTranscript immutably as original evidence.
 * 2. Produces verifiedTranscript via high-confidence contextual & phonetic corrections.
 * 3. Records structured corrections: [{ original, corrected, reason, confidence }].
 * 4. Records uncertainSegments: [{ text, reason }] without fabricating words.
 * 5. Strict empty & noise detection (silence, filler-only, non-responsive monosyllables).
 * 6. Preserves candidate's exact intended meaning without rewriting or embellishing.
 */

export interface TranscriptCorrection {
  original: string;
  corrected: string;
  reason: string;
  confidence: number;
}

export interface UncertainSegment {
  text: string;
  reason: string;
}

export interface VerificationContext {
  question?: string;
  currentQuestion?: string;
  category?: string;
  candidateTechStack?: string[];
  domainVocabulary?: string[];
}

export interface TranscriptValidationResult {
  rawTranscript: string;
  verifiedTranscript: string;
  corrections: TranscriptCorrection[];
  uncertainSegments: UncertainSegment[];
  isEmpty: boolean;
  isFillerOnly: boolean;
  isNonResponsive: boolean;
  hasSpeech: boolean;
  wordCount: number;
  rejectionReason?: string;
  normalizedTerms: string[];
}

// Pure vocal fillers (stutters & sounds) — excludes valid standalone words like "you", "know", "so", "just"
const PURE_FILLER_SOUNDS = new Set([
  'um', 'umm', 'uh', 'uhh', 'ah', 'ahh', 'er', 'err',
  'hmm', 'hm', 'eh'
]);

// All filler tokens for whole-response filler-only detection
const ALL_FILLER_TOKENS = new Set([
  'um', 'umm', 'uh', 'uhh', 'ah', 'ahh', 'er', 'err',
  'hmm', 'hm', 'eh',
  'yeah', 'yep', 'nope', 'nah', 'ok', 'okay',
  'so', 'actually', 'like', 'well', 'you', 'know'
]);

// Multi-word filler phrases
const FILLER_PHRASES = [
  'you know', 'actually yeah', 'so yeah', 'okay yeah', 'i mean'
];

// Non-responsive monosyllables for open-ended behavioral questions
const NON_RESPONSIVE_MONOSYLLABLES = new Set([
  'yes', 'no', 'yeah', 'yep', 'nope', 'nah', 'ok', 'okay',
  'sure', 'fine', 'right', 'maybe', 'idk', 'k'
]);

// Browser recording placeholders or synthetic silence tokens
const SILENCE_PLACEHOLDERS = [
  '[candidate audio response recorded]',
  '[candidate audio response]',
  '[no speech]',
  '[no speech detected]',
  'no speech',
  'no speech detected',
  'no transcript recorded',
  'no transcript recorded.',
  'silence',
  'inaudible',
  'unanswered',
  'empty'
];

interface HighConfidenceRule {
  pattern: RegExp;
  replacement: string;
  reason: string;
  confidence: number;
  contextKeywords?: string[];
}

const HIGH_CONFIDENCE_RULES: HighConfidenceRule[] = [
  // Programming Languages & Frameworks
  {
    pattern: /\bjava\s*script\b/gi,
    replacement: 'JavaScript',
    reason: 'Standard casing for technical language JavaScript',
    confidence: 0.99,
  },
  {
    pattern: /\btype\s*script\b/gi,
    replacement: 'TypeScript',
    reason: 'Standard casing for technical language TypeScript',
    confidence: 0.99,
  },
  {
    pattern: /\bc\s*plus\s*plus\b/gi,
    replacement: 'C++',
    reason: 'Phonetic transcription for C++',
    confidence: 0.98,
  },
  {
    pattern: /\bc\s*sharp\b/gi,
    replacement: 'C#',
    reason: 'Phonetic transcription for C#',
    confidence: 0.98,
  },
  {
    pattern: /\breact\s*js\b/gi,
    replacement: 'React.js',
    reason: 'Standard framework library naming',
    confidence: 0.98,
  },
  {
    pattern: /\bnode\s*js\b/gi,
    replacement: 'Node.js',
    reason: 'Standard runtime environment naming',
    confidence: 0.98,
  },
  {
    pattern: /\bnext\s*js\b/gi,
    replacement: 'Next.js',
    reason: 'Standard framework naming',
    confidence: 0.98,
  },
  {
    pattern: /\bvue\s*js\b/gi,
    replacement: 'Vue.js',
    reason: 'Standard framework naming',
    confidence: 0.98,
  },
  {
    pattern: /\bexpress\s*js\b/gi,
    replacement: 'Express.js',
    reason: 'Standard backend framework naming',
    confidence: 0.98,
  },

  // Databases & Storage
  {
    pattern: /\bmango\s*db\b/gi,
    replacement: 'MongoDB',
    reason: 'Phonetic homophone correction for database MongoDB',
    confidence: 0.98,
  },
  {
    pattern: /\bmongo\s*db\b/gi,
    replacement: 'MongoDB',
    reason: 'Standard casing for MongoDB database',
    confidence: 0.98,
  },
  {
    pattern: /\bpost\s*gres\b/gi,
    replacement: 'PostgreSQL',
    reason: 'Standard database name abbreviation normalization',
    confidence: 0.96,
  },
  {
    pattern: /\bpost\s*gre\s*sql\b/gi,
    replacement: 'PostgreSQL',
    reason: 'Standard casing for PostgreSQL database',
    confidence: 0.98,
  },
  {
    pattern: /\bpost\s*grass\b/gi,
    replacement: 'PostgreSQL',
    reason: 'Phonetic correction for PostgreSQL database in database context',
    confidence: 0.94,
    contextKeywords: ['database', 'sql', 'backend', 'query', 'table', 'db', 'server'],
  },
  {
    pattern: /\bmy\s*sequel\b/gi,
    replacement: 'MySQL',
    reason: 'Phonetic correction for MySQL database',
    confidence: 0.95,
    contextKeywords: ['database', 'db', 'query', 'table', 'sql', 'backend'],
  },

  // Data Formats & Protocols
  {
    pattern: /\bjason\b/gi,
    replacement: 'JSON',
    reason: 'Homophone correction for data interchange format JSON',
    confidence: 0.92,
    contextKeywords: ['api', 'fetch', 'data', 'parse', 'response', 'format', 'request', 'payload', 'schema', 'endpoint'],
  },
  {
    pattern: /\brest\s*api\b/gi,
    replacement: 'REST API',
    reason: 'Standard acronym capitalization for architectural style',
    confidence: 0.98,
  },
  {
    pattern: /\brestful\s*api\b/gi,
    replacement: 'RESTful API',
    reason: 'Standard acronym capitalization',
    confidence: 0.98,
  },
  {
    pattern: /\bgraph\s*ql\b/gi,
    replacement: 'GraphQL',
    reason: 'Standard capitalization for query language',
    confidence: 0.98,
  },

  // Cloud & DevOps
  {
    pattern: /\bcooper\s*nettes?\b/gi,
    replacement: 'Kubernetes',
    reason: 'Phonetic homophone correction for Kubernetes container orchestration',
    confidence: 0.95,
  },
  {
    pattern: /\bcooper\s*netis?\b/gi,
    replacement: 'Kubernetes',
    reason: 'Phonetic homophone correction for Kubernetes',
    confidence: 0.95,
  },
  {
    pattern: /\bdock\s*er\b/gi,
    replacement: 'Docker',
    reason: 'Standard capitalization for Docker containerization',
    confidence: 0.98,
  },
  {
    pattern: /\bgit\s*hub\b/gi,
    replacement: 'GitHub',
    reason: 'Standard platform capitalization',
    confidence: 0.99,
  },
  {
    pattern: /\bgit\s*lab\b/gi,
    replacement: 'GitLab',
    reason: 'Standard platform capitalization',
    confidence: 0.99,
  },

  // AI & Computer Vision
  {
    pattern: /\byellow\s*v\s*8\b/gi,
    replacement: 'YOLOv8',
    reason: 'Phonetic transcription correction for YOLOv8 model',
    confidence: 0.98,
  },
  {
    pattern: /\byellow\s*8\b/gi,
    replacement: 'YOLOv8',
    reason: 'Phonetic transcription correction for YOLOv8 model',
    confidence: 0.98,
  },
  {
    pattern: /\byolo\s*v\s*8\b/gi,
    replacement: 'YOLOv8',
    reason: 'Standard casing for computer vision object detection model',
    confidence: 0.99,
  },
  {
    pattern: /\byellow\b/gi,
    replacement: 'YOLO',
    reason: 'Phonetic homophone correction for YOLO architecture in vision context',
    confidence: 0.92,
    contextKeywords: ['vision', 'model', 'detection', 'object', 'segmentation', 'waste', 'image', 'opencv', 'bounding'],
  },
  {
    pattern: /\bopen\s*cv\b/gi,
    replacement: 'OpenCV',
    reason: 'Standard casing for OpenCV computer vision library',
    confidence: 0.98,
  },
  {
    pattern: /\bopen\s*cb\b/gi,
    replacement: 'OpenCV',
    reason: 'Phonetic transcription correction for OpenCV',
    confidence: 0.95,
  },
  {
    pattern: /\bfast\s*api\b/gi,
    replacement: 'FastAPI',
    reason: 'Standard casing for Python FastAPI framework',
    confidence: 0.98,
  },
  {
    pattern: /\bfirst\s*api\b/gi,
    replacement: 'FastAPI',
    reason: 'Phonetic correction for FastAPI framework in Python backend context',
    confidence: 0.92,
    contextKeywords: ['python', 'backend', 'api', 'server', 'framework'],
  },
  {
    pattern: /\bpie\s*torch\b/gi,
    replacement: 'PyTorch',
    reason: 'Phonetic correction for deep learning framework PyTorch',
    confidence: 0.98,
  },
  {
    pattern: /\bpi\s*torch\b/gi,
    replacement: 'PyTorch',
    reason: 'Phonetic correction for PyTorch',
    confidence: 0.98,
  },
  {
    pattern: /\btensor\s*flow\b/gi,
    replacement: 'TensorFlow',
    reason: 'Standard casing for ML framework TensorFlow',
    confidence: 0.98,
  },
  {
    pattern: /\bbyte\s*track\b/gi,
    replacement: 'ByteTrack',
    reason: 'Standard casing for object tracking algorithm',
    confidence: 0.98,
  },
  {
    pattern: /\bbite\s*track\b/gi,
    replacement: 'ByteTrack',
    reason: 'Phonetic correction for ByteTrack tracking algorithm',
    confidence: 0.94,
    contextKeywords: ['tracking', 'yolo', 'vision', 'object', 'detection'],
  },
];

export class HRTranscriptValidator {
  /**
   * Primary entry point: Context-Aware Transcript Verification.
   * Preserves rawTranscript immutably and produces verifiedTranscript with high-confidence corrections.
   */
  static verifyTranscript(
    rawInput: string | null | undefined,
    context?: VerificationContext
  ): TranscriptValidationResult {
    const rawTranscript = (rawInput || '').trim();

    // 1. Absolute Emptiness Check
    if (!rawTranscript) {
      return {
        rawTranscript: '',
        verifiedTranscript: '',
        corrections: [],
        uncertainSegments: [],
        isEmpty: true,
        isFillerOnly: false,
        isNonResponsive: false,
        hasSpeech: false,
        wordCount: 0,
        rejectionReason: 'No speech was detected or transcript was empty.',
        normalizedTerms: [],
      };
    }

    const lowerRaw = rawTranscript.toLowerCase();

    // 2. Synthetic Silence / Browser Recording Placeholder Check
    const isPlaceholder = SILENCE_PLACEHOLDERS.some((p) => lowerRaw === p || lowerRaw === `[${p}]`);
    if (isPlaceholder) {
      return {
        rawTranscript,
        verifiedTranscript: '',
        corrections: [],
        uncertainSegments: [],
        isEmpty: true,
        isFillerOnly: false,
        isNonResponsive: false,
        hasSpeech: false,
        wordCount: 0,
        rejectionReason: 'Silence detected (no candidate speech recorded).',
        normalizedTerms: [],
      };
    }

    // 3. Word Tokenization (stripping standard punctuation)
    const cleanedWords = rawTranscript
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const wordCount = cleanedWords.length;

    if (wordCount === 0) {
      return {
        rawTranscript,
        verifiedTranscript: '',
        corrections: [],
        uncertainSegments: [],
        isEmpty: true,
        isFillerOnly: false,
        isNonResponsive: false,
        hasSpeech: false,
        wordCount: 0,
        rejectionReason: 'Transcript contained only punctuation or whitespace.',
        normalizedTerms: [],
      };
    }

    // 4. Whole-Response Filler Sounds / Hesitation Check
    // If every single word in the response is a filler sound, stutter, or hesitation token,
    // then the response contains no substantive content.
    const nonFillerWords = cleanedWords.filter((w) => !ALL_FILLER_TOKENS.has(w));
    if (nonFillerWords.length === 0) {
      return {
        rawTranscript,
        verifiedTranscript: rawTranscript,
        corrections: [],
        uncertainSegments: [
          {
            text: rawTranscript,
            reason: 'Audio contained only vocal hesitation sounds and filler words without substantive answer content',
          },
        ],
        isEmpty: true,
        isFillerOnly: true,
        isNonResponsive: true,
        hasSpeech: true,
        wordCount,
        rejectionReason: 'No response was provided, so there was insufficient evidence to evaluate this question (transcript contained only vocal filler sounds).',
        normalizedTerms: [],
      };
    }

    // 5. Non-Responsive Monosyllables on Open-Ended Questions Check
    const qLower = (context?.currentQuestion || context?.question || '').toLowerCase();
    const isYesNoQuestion =
      /\b(?:do you|have you|did you|are you|is it|can you)\b/i.test(qLower) &&
      !/\b(?:describe|explain|tell me|walk me through|what|how|why)\b/i.test(qLower);

    if (!isYesNoQuestion && wordCount <= 2) {
      const allMonosyllables = cleanedWords.every((w) => NON_RESPONSIVE_MONOSYLLABLES.has(w) || PURE_FILLER_SOUNDS.has(w));
      if (allMonosyllables) {
        return {
          rawTranscript,
          verifiedTranscript: rawTranscript,
          corrections: [],
          uncertainSegments: [],
          isEmpty: true,
          isFillerOnly: false,
          isNonResponsive: true,
          hasSpeech: true,
          wordCount,
          rejectionReason: `Response "${rawTranscript}" is non-responsive for an open-ended behavioral question.`,
          normalizedTerms: [],
        };
      }
    }

    // 6. Context-Aware High-Confidence Transcription Correction
    let verified = rawTranscript;
    const corrections: TranscriptCorrection[] = [];
    const uncertainSegments: UncertainSegment[] = [];
    const normalizedTerms: string[] = [];

    // Build context corpus from question, category, candidate tech stack, and domain vocabulary
    const fullContextText = [
      qLower,
      (context?.category || '').toLowerCase(),
      ...(context?.candidateTechStack || []).map((t) => t.toLowerCase()),
      ...(context?.domainVocabulary || []).map((v) => v.toLowerCase()),
      lowerRaw,
    ].join(' ');

    for (const rule of HIGH_CONFIDENCE_RULES) {
      // If rule requires specific context keywords, verify context
      if (rule.contextKeywords && rule.contextKeywords.length > 0) {
        const matchesContext = rule.contextKeywords.some((kw) => fullContextText.includes(kw));
        if (!matchesContext) continue;
      }

      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(verified)) {
        rule.pattern.lastIndex = 0;
        verified = verified.replace(rule.pattern, (matchedStr) => {
          // If match is already the correct casing, skip
          if (matchedStr === rule.replacement) return matchedStr;

          corrections.push({
            original: matchedStr,
            corrected: rule.replacement,
            reason: rule.reason,
            confidence: rule.confidence,
          });
          normalizedTerms.push(`${matchedStr} -> ${rule.replacement}`);
          return rule.replacement;
        });
      }
    }

    // 7. Check for Candidate Tech Stack contextual casing
    if (Array.isArray(context?.candidateTechStack) && context.candidateTechStack.length > 0) {
      for (const tech of context.candidateTechStack) {
        if (!tech || tech.length < 3) continue;
        const techPattern = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (techPattern.test(verified)) {
          techPattern.lastIndex = 0;
          verified = verified.replace(techPattern, (matchedStr) => {
            if (matchedStr === tech) return matchedStr;
            corrections.push({
              original: matchedStr,
              corrected: tech,
              reason: `Matched candidate technology profile: ${tech}`,
              confidence: 0.95,
            });
            return tech;
          });
        }
      }
    }

    // 8. Identify Uncertain Segments (e.g. trailing ellipses, inaudible marks, obvious STT corruption)
    const uncertainPatterns = [
      { pattern: /(?:\[inaudible\]|\binaudible\b|\.{2,}|…)/gi, reason: 'Inaudible or trailing speech segment' },
      { pattern: /\b(\w+)\s+\1\s+\1\b/gi, reason: 'Repeated word stutter detected' },
      { pattern: /\b(?:hello\s+i\s+am\s+\w+\s+hello\s+i\s+am|hello\s+i\s+am\s+driving)\b/gi, reason: 'Acoustically ambiguous speech restart / false start' },
      { pattern: /\bconstable\b/gi, reason: 'Acoustic STT corruption: unrecognized word in technical interview context' },
    ];

    for (const up of uncertainPatterns) {
      const match = verified.match(up.pattern);
      if (match) {
        match.forEach((m) => {
          if (!uncertainSegments.some((u) => u.text.toLowerCase() === m.toLowerCase())) {
            uncertainSegments.push({ text: m, reason: up.reason });
          }
        });
      }
    }

    return {
      rawTranscript,
      verifiedTranscript: verified,
      corrections,
      uncertainSegments,
      isEmpty: false,
      isFillerOnly: false,
      isNonResponsive: false,
      hasSpeech: true,
      wordCount,
      normalizedTerms,
    };
  }

  /**
   * Helper method to check if text contains solely filler / hesitation sounds.
   */
  static isPureFiller(text: string | null | undefined): boolean {
    if (!text || !text.trim()) return true;
    const res = this.verifyTranscript(text);
    return res.isEmpty || res.isFillerOnly || res.isNonResponsive;
  }

  /**
   * Backward-compatible wrapper for existing call sites.
   */
  static validate(
    rawInput: string | null | undefined,
    questionContext?: { question: string; category: string }
  ): TranscriptValidationResult {
    return this.verifyTranscript(rawInput, {
      question: questionContext?.question,
      category: questionContext?.category,
    });
  }
}
