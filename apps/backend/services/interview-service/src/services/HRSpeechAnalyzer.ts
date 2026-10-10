/**
 * HRSpeechAnalyzer.ts
 *
 * Phase 3: HR Filler Word & Speech Pattern Intelligence
 *
 * Analyzes candidate spoken response patterns:
 *  - Contextual filler word detection (distinguishes literal "I like Java" / "You know Python" from disfluencies)
 *  - Immediate word & phrase repetition detection
 *  - False starts (abandoned sentence constructions)
 *  - Honest hesitation analysis (transcript-based vs audio-derived)
 *  - Speaking pace (WPM) calculation with reliable duration guard
 *  - Language confidence vs uncertainty markers (never claiming psychological diagnoses)
 *  - Sentence structure metrics (sentence count, avg words/sentence, fragmentation)
 *  - Actionable communication recommendations
 *
 * STRICT INTEGRITY:
 *  - Diagnostic & coaching feature only.
 *  - NEVER modifies or dilutes the official deterministic HR score from HRScoreEngine.
 */

import axios from 'axios';

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'GROQ').toUpperCase();
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── Contracts ───────────────────────────────────────────────────────────────

export interface FillerWordsResult {
  total: number;
  ratePer100Words: number;
  breakdown: Record<string, number>;
}

export interface RepetitionItem {
  text: string;
  type: 'word' | 'phrase';
  count: number;
}

export interface RepetitionsResult {
  count: number;
  items: RepetitionItem[];
}

export interface FalseStartItem {
  text: string;
  reason: string;
}

export interface FalseStartsResult {
  count: number;
  items: FalseStartItem[];
}

export interface HesitationsResult {
  source: 'transcript' | 'audio';
  count: number;
  pauseCount: number | null;
  averagePauseMs: number | null;
}

export interface SpeechPaceResult {
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number | null;
  classification: 'slow' | 'normal' | 'fast' | 'very_fast' | 'unavailable';
}

export interface ConfidenceMarkersResult {
  confidenceCount: number;
  uncertaintyCount: number;
  confidenceRatio: number;
  examples: Array<{ type: 'confidence' | 'uncertainty'; text: string }>;
  confidenceExamples: string[];
  uncertaintyExamples: string[];
}

export interface SentenceStructureResult {
  sentenceCount: number;
  averageWordsPerSentence: number;
  longestSentenceWords: number;
  fragmentedSentenceCount: number;
}

export interface CommunicationAssessmentResult {
  clarity: 'excellent' | 'good' | 'fair' | 'needs_work';
  conciseness: 'concise' | 'moderate' | 'verbose';
  fluency: 'fluent' | 'good' | 'hesitant';
}

export interface SpeechAnalysisResult {
  status: 'completed' | 'failed' | 'unavailable' | 'pending';
  fillerWords: FillerWordsResult;
  repetitions: RepetitionsResult;
  falseStarts: FalseStartsResult;
  hesitations: HesitationsResult;
  speechPace: SpeechPaceResult;
  confidenceMarkers: ConfidenceMarkersResult;
  sentenceStructure: SentenceStructureResult;
  communicationAssessment: CommunicationAssessmentResult;
  recommendations: string[];
  metadata: {
    analysisVersion: string;
    model: string;
    promptVersion: string;
    generatedAt: string;
    status: 'completed' | 'failed' | 'unavailable' | 'pending';
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLLMAvailable(): boolean {
  return LLM_PROVIDER === 'GROQ' && !!LLM_API_KEY && LLM_API_KEY.length > 10;
}

async function callGroq(messages: Array<{ role: string; content: string }>, maxTokens = 600): Promise<string> {
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 18000,
    }
  );
  return response.data?.choices?.[0]?.message?.content?.trim() || '';
}

export class HRSpeechAnalyzer {
  /**
   * Main entry point: Analyze speech patterns for a single candidate response.
   */
  static async analyze(
    verifiedTranscript: string,
    rawTranscriptOrDuration: string | number = '',
    durationSeconds = 0,
    audioOrUncertain?: any
  ): Promise<SpeechAnalysisResult> {
    let rawText = '';
    let duration = durationSeconds;
    let uncertainSegments: Array<{ text: string; reason: string }> = [];
    let audioData: any = undefined;

    if (typeof rawTranscriptOrDuration === 'number') {
      duration = rawTranscriptOrDuration;
      rawText = verifiedTranscript || '';
      // If duration was 2nd arg, audioData / uncertainSegments could be in durationSeconds position or audioOrUncertain
      const nextArg = durationSeconds as any;
      if (nextArg && typeof nextArg === 'object') {
        if (Array.isArray(nextArg)) {
          uncertainSegments = nextArg;
        } else {
          audioData = nextArg;
        }
      } else if (audioOrUncertain && typeof audioOrUncertain === 'object') {
        if (Array.isArray(audioOrUncertain)) {
          uncertainSegments = audioOrUncertain;
        } else {
          audioData = audioOrUncertain;
        }
      }
    } else {
      rawText = typeof rawTranscriptOrDuration === 'string' ? rawTranscriptOrDuration : '';
      if (Array.isArray(audioOrUncertain)) {
        uncertainSegments = audioOrUncertain;
      } else if (audioOrUncertain && typeof audioOrUncertain === 'object') {
        audioData = audioOrUncertain;
      }
    }

    const trimmed = (verifiedTranscript || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Case 1: Empty speech
    if (wordCount === 0) {
      return this.emptyAnalysisResult(duration);
    }

    // Compute deterministic heuristic analysis
    const deterministic = this.analyzeDeterministic(trimmed, rawText, duration, uncertainSegments, audioData);

    // If LLM available, enrich coaching recommendations without changing deterministic measurements
    if (isLLMAvailable() && wordCount >= 10) {
      try {
        const enrichedRecommendations = await this.enrichRecommendationsWithLLM(trimmed, deterministic);
        if (enrichedRecommendations && enrichedRecommendations.length > 0) {
          deterministic.recommendations = enrichedRecommendations;
        }
      } catch {
        // Keep deterministic recommendations
      }
    }

    return deterministic;
  }

  /**
   * Return a standardized empty/unavailable speech analysis result.
   */
  static emptyAnalysisResult(durationSeconds = 0): SpeechAnalysisResult {
    return {
      status: 'unavailable',
      fillerWords: {
        total: 0,
        ratePer100Words: 0,
        breakdown: {},
      },
      repetitions: {
        count: 0,
        items: [],
      },
      falseStarts: {
        count: 0,
        items: [],
      },
      hesitations: {
        source: 'transcript',
        count: 0,
        pauseCount: null,
        averagePauseMs: null,
      },
      speechPace: {
        wordCount: 0,
        durationSeconds: durationSeconds > 0 ? durationSeconds : 0,
        wordsPerMinute: null,
        classification: 'unavailable',
      },
      confidenceMarkers: {
        confidenceCount: 0,
        uncertaintyCount: 0,
        confidenceRatio: 0,
        examples: [],
        confidenceExamples: [],
        uncertaintyExamples: [],
      },
      sentenceStructure: {
        sentenceCount: 0,
        averageWordsPerSentence: 0,
        longestSentenceWords: 0,
        fragmentedSentenceCount: 0,
      },
      communicationAssessment: {
        clarity: 'needs_work',
        conciseness: 'concise',
        fluency: 'hesitant',
      },
      recommendations: [
        'Speak clearly and directly into the microphone.',
        'Use the STAR method to structure your thoughts before speaking.',
      ],
      metadata: {
        analysisVersion: '1.0',
        model: 'deterministic-rules',
        promptVersion: 'hr-speech-v1',
        generatedAt: new Date().toISOString(),
        status: 'unavailable',
      },
    };
  }

  /**
   * Deterministic pattern extraction engine.
   */
  static analyzeDeterministic(
    verifiedTranscript: string,
    rawTranscript: string = '',
    durationSeconds: number = 0,
    uncertainSegments: Array<{ text: string; reason: string }> = [],
    audioData?: any
  ): SpeechAnalysisResult {
    const rawSafe = typeof rawTranscript === 'string' ? rawTranscript : '';
    const textToAnalyze = (verifiedTranscript || '').trim();
    // Words without punctuation for accurate counting
    const words = textToAnalyze.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Contextual Filler Word Detection
    const fillerResult = this.detectFillerWords(textToAnalyze, rawSafe, wordCount);

    // 2. Repetition Detection
    const repetitionResult = this.detectRepetitions(textToAnalyze);

    // 3. False Start Detection
    const falseStartResult = this.detectFalseStarts(textToAnalyze, rawSafe);

    // 4. Hesitation Analysis
    const hesitationResult = this.detectHesitations(textToAnalyze, rawSafe, uncertainSegments, audioData);

    // 5. Speaking Pace (WPM)
    const paceResult = this.calculatePace(wordCount, durationSeconds);

    // 6. Language Confidence & Uncertainty Markers
    const confidenceResult = this.detectConfidenceMarkers(textToAnalyze);

    // 7. Sentence Structure Metrics
    const sentenceResult = this.analyzeSentenceStructure(textToAnalyze, wordCount);

    // 8. Communication Assessment & Recommendations
    const assessment = this.assessCommunication(fillerResult, repetitionResult, paceResult, confidenceResult);
    const recommendations = this.generateRecommendations(fillerResult, repetitionResult, falseStartResult, paceResult, confidenceResult);

    return {
      status: 'completed',
      fillerWords: fillerResult,
      repetitions: repetitionResult,
      falseStarts: falseStartResult,
      hesitations: hesitationResult,
      speechPace: paceResult,
      confidenceMarkers: confidenceResult,
      sentenceStructure: sentenceResult,
      communicationAssessment: assessment,
      recommendations,
      metadata: {
        analysisVersion: '1.0',
        model: 'deterministic-rules',
        promptVersion: 'hr-speech-v1',
        generatedAt: new Date().toISOString(),
        status: 'completed',
      },
    };
  }

  /**
   * Contextual Filler Word Detector.
   * Strictly distinguishes legitimate usage from genuine disfluencies.
   */
  private static detectFillerWords(
    verifiedText: string,
    rawText: string,
    wordCount: number
  ): FillerWordsResult {
    const breakdown: Record<string, number> = {};
    let total = 0;

    const rawSafe = typeof rawText === 'string' ? rawText : '';
    const verifiedSafe = typeof verifiedText === 'string' ? verifiedText : '';

    // Helper to increment breakdown
    const addFiller = (name: string, count = 1) => {
      if (count <= 0) return;
      breakdown[name] = (breakdown[name] || 0) + count;
      total += count;
    };

    // Analyze combined text (raw captures acoustic fillers like "um/uh", verified captures preserved phrases)
    const combined = `${rawSafe} ${verifiedSafe}`.toLowerCase();

    // 1. Pure vocal fillers: "um", "uh", "erm", "hmm", "ah", "ahh", "umm", "uhh"
    // Use rawSafe first so we count acoustic fillers before transcript normalization
    const vocalTarget = rawSafe ? rawSafe.toLowerCase() : verifiedSafe.toLowerCase();
    const vocalMatches = vocalTarget.match(/\b(um|uh|erm|hmm|ah|umm|uhh)\b/g) || [];
    vocalMatches.forEach((m) => addFiller(m));

    // 2. Multi-word contextual filler: "you know"
    // "You know, I worked..." -> filler.
    // "You know Python and Java." -> literal verb, NOT filler!
    // Regex matches "you know" followed by a comma or used as a clause parenthetical
    const youKnowMatches = verifiedText.match(/(?:^|[,\s])you\s+know(?:\s*,|\s+(?:like|I|we|so|um|uh|actually)|$)/gi) || [];
    // Verify it's not "do you know" or "as you know" or "if you know" or followed by direct noun
    youKnowMatches.forEach((match) => {
      const idx = verifiedText.toLowerCase().indexOf(match.toLowerCase());
      if (idx > 0) {
        const preceding = verifiedText.substring(Math.max(0, idx - 15), idx).toLowerCase();
        if (/(do|if|did|would|as|don't)\s+$/i.test(preceding)) return;
      }
      // Check following words: if "you know python", "you know that", "you know how" -> not filler
      const following = verifiedText.substring(idx + match.length, idx + match.length + 20).trim().toLowerCase();
      if (/^(python|java|javascript|react|c\+\+|sql|how|that|what|where|who)\b/i.test(following)) return;

      addFiller('you know');
    });

    // 3. Multi-word contextual filler: "i mean"
    const iMeanMatches = verifiedText.match(/(?:^|[,\s])i\s+mean(?:\s*,|\s+(?:like|I|we|so|it|the)|$)/gi) || [];
    iMeanMatches.forEach((match) => {
      const idx = verifiedText.toLowerCase().indexOf(match.toLowerCase());
      if (idx > 0) {
        const preceding = verifiedText.substring(Math.max(0, idx - 15), idx).toLowerCase();
        if (/what\s+$/i.test(preceding)) return; // "what I mean"
      }
      addFiller('I mean');
    });

    // 4. "sort of" / "kind of"
    const sortOfMatches = verifiedText.match(/\b(sort\s+of|kind\s+of)\b/gi) || [];
    sortOfMatches.forEach((m) => addFiller(m.toLowerCase()));

    // 5. Contextual "like"
    // "I like Java" -> verb, NOT filler.
    // "frameworks like React" -> preposition, NOT filler.
    // "It was, like, very fast" or "We, like, implemented" -> filler.
    const likeMatches = verifiedText.match(/(?:,\s*like\s*,|\b(?:was|were|had|is|are|it)\s+like\s+(?:very|super|just|really|kind of|sort of)\b|\b(?:and|so)\s+like\s+[a-z])/gi) || [];
    likeMatches.forEach(() => addFiller('like'));

    // 6. Contextual "well"
    // "Well, the main issue was..." -> discourse transition, NOT filler.
    // "Well, well" or hesitant "Well, um," -> filler.
    const hesitantWell = verifiedText.match(/\bwell\s*,\s*(?:well|um|uh|actually|like)\b/gi) || [];
    hesitantWell.forEach(() => addFiller('well'));

    // 7. Verbal crutches: "literally", "basically" (when used >= 2 times as crutches)
    const basicallyCount = (verifiedText.match(/\bbasically\b/gi) || []).length;
    if (basicallyCount >= 2) addFiller('basically', basicallyCount);

    const literallyCount = (verifiedText.match(/\bliterally\b/gi) || []).length;
    if (literallyCount >= 2) addFiller('literally', literallyCount);

    // Calculate rate per 100 words
    const ratePer100Words = wordCount > 0
      ? Math.round((total / wordCount) * 100 * 10) / 10
      : 0;

    return {
      total,
      ratePer100Words,
      breakdown,
    };
  }

  /**
   * Repetition Detection.
   * Identifies immediate word or phrase stuttering while excluding legitimate semantic repetitions.
   */
  private static detectRepetitions(text: string): RepetitionsResult {
    const items: RepetitionItem[] = [];

    // 1. Immediate word repetition e.g. "I I worked", "the the system", "we we did"
    // Regex matches consecutive identical words separated only by whitespace or punctuation
    const wordRepRegex = /\b([a-zA-Z]+)(?:[,\s]+)\1\b/gi;
    let match: RegExpExecArray | null;

    while ((match = wordRepRegex.exec(text)) !== null) {
      const repeatedWord = match[1];
      // Exclude common grammatical repetitions if any (e.g. "had had")
      if (repeatedWord.toLowerCase() === 'had') continue;

      items.push({
        text: `${repeatedWord} ${repeatedWord}`,
        type: 'word',
        count: 2,
      });
    }

    // 2. Immediate short phrase repetition e.g. "I mean I mean", "in the in the"
    const phraseRepRegex = /\b([a-zA-Z]+\s+[a-zA-Z]+)(?:[,\s]+)\1\b/gi;
    while ((match = phraseRepRegex.exec(text)) !== null) {
      const repeatedPhrase = match[1];
      items.push({
        text: `${repeatedPhrase} ${repeatedPhrase}`,
        type: 'phrase',
        count: 2,
      });
    }

    return {
      count: items.length,
      items,
    };
  }

  /**
   * False Start Detection.
   * Identifies abandoned sentence beginnings followed by restarts.
   */
  private static detectFalseStarts(verifiedText: string, rawText: string): FalseStartsResult {
    const items: FalseStartItem[] = [];

    const combined = `${rawText} ${verifiedText}`;

    // Patterns like:
    // "I implemented the... actually I designed..."
    // "We used... no, we implemented..."
    // "The main reason... I mean, the main problem..."
    const falseStartRegex = /\b([a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})\s*(?:\.\.\.|--)\s*(?:actually|no|wait|I mean|rather|let me|instead)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})/gi;

    let match: RegExpExecArray | null;
    while ((match = falseStartRegex.exec(combined)) !== null) {
      items.push({
        text: match[0],
        reason: 'Sentence construction abandoned and restarted mid-thought',
      });
    }

    // Also detect trailing restarts without explicit connector e.g. "I started with... I decided to..."
    const restartRegex = /\b(I\s+[a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\s*(?:\.\.\.|--)\s*(I\s+[a-zA-Z]+)/gi;
    while ((match = restartRegex.exec(combined)) !== null) {
      if (!items.some((it) => it.text.includes(match![0]))) {
        items.push({
          text: match[0],
          reason: 'Thought restarted before completing sentence',
        });
      }
    }

    return {
      count: items.length,
      items,
    };
  }

  /**
   * Hesitation Analysis.
   * Honestly distinguishes transcript-based indications from audio-derived metrics.
   */
  private static detectHesitations(
    verifiedText: string,
    rawText: string,
    uncertainSegments: Array<{ text: string; reason: string }> = [],
    audioData?: any
  ): HesitationsResult {
    // If explicit audio timestamps are available from the recording pipeline
    if (audioData?.pauseSegments && Array.isArray(audioData.pauseSegments) && audioData.pauseSegments.length > 0) {
      const pauseCount = audioData.pauseSegments.length;
      const totalPauseMs = audioData.pauseSegments.reduce((sum: number, p: any) => sum + (p.durationMs || 0), 0);
      const averagePauseMs = Math.round(totalPauseMs / pauseCount);
      return {
        source: 'audio',
        count: pauseCount,
        pauseCount,
        averagePauseMs,
      };
    }

    const rawSafe = typeof rawText === 'string' ? rawText : '';
    const verifiedSafe = typeof verifiedText === 'string' ? verifiedText : '';
    const combined = `${rawSafe} ${verifiedSafe}`;

    // Count ellipsis or prolonged dashes indicating pauses in transcript
    const ellipsisMatches = combined.match(/(?:\.\.\.|--)/g) || [];
    const count = ellipsisMatches.length + uncertainSegments.length;

    return {
      source: 'transcript',
      count,
      pauseCount: null, // Audio timestamps not available from browser STT
      averagePauseMs: null, // Zero fabricated pause milliseconds
    };
  }

  /**
   * Speaking Pace Calculation.
   * Computes Words Per Minute (WPM) only when duration is reliable and non-zero.
   */
  private static calculatePace(wordCount: number, durationSeconds: number): SpeechPaceResult {
    if (!durationSeconds || durationSeconds <= 0 || wordCount <= 0) {
      return {
        wordCount,
        durationSeconds: durationSeconds || 0,
        wordsPerMinute: null,
        classification: 'unavailable',
      };
    }

    const wordsPerMinute = Math.round((wordCount / durationSeconds) * 60);

    let classification: 'slow' | 'normal' | 'fast' | 'very_fast';
    if (wordsPerMinute < 90) {
      classification = 'slow';
    } else if (wordsPerMinute <= 160) {
      classification = 'normal';
    } else if (wordsPerMinute <= 190) {
      classification = 'fast';
    } else {
      classification = 'very_fast';
    }

    return {
      wordCount,
      durationSeconds,
      wordsPerMinute,
      classification,
    };
  }

  /**
   * Language Confidence & Uncertainty Marker Detection.
   * Strictly focused on linguistic markers without claiming psychological states.
   */
  private static detectConfidenceMarkers(text: string): ConfidenceMarkersResult {
    const examples: Array<{ type: 'confidence' | 'uncertainty'; text: string }> = [];

    // 1. Language confidence markers: strong ownership + concrete action verbs
    const confMatches = text.match(/\bI\s+(implemented|designed|built|solved|led|tested|verified|configured|deployed|analyzed|optimized|refactored|spearheaded|architected|resolved)\b/gi) || [];
    confMatches.forEach((m) => {
      examples.push({ type: 'confidence', text: m.trim() });
    });

    // 2. Language uncertainty markers: hedging qualifiers
    const uncertMatches = text.match(/\b(I think|maybe|probably|I guess|I'm not sure|not really sure|possibly|might be|could be)\b/gi) || [];
    uncertMatches.forEach((m) => {
      examples.push({ type: 'uncertainty', text: m.trim() });
    });

    const confidenceCount = confMatches.length;
    const uncertaintyCount = uncertMatches.length;
    const totalMarkers = confidenceCount + uncertaintyCount;

    const confidenceRatio = totalMarkers > 0
      ? Math.round((confidenceCount / totalMarkers) * 100) / 100
      : 1.0;

    return {
      confidenceCount,
      uncertaintyCount,
      confidenceRatio,
      examples: examples.slice(0, 6),
      confidenceExamples: confMatches.map((m) => m.trim()).slice(0, 5),
      uncertaintyExamples: uncertMatches.map((m) => m.trim()).slice(0, 5),
    };
  }

  /**
   * Sentence Structure Analysis.
   */
  private static analyzeSentenceStructure(text: string, wordCount: number): SentenceStructureResult {
    // Split sentences by terminal punctuation
    const rawSentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
    const sentenceCount = Math.max(1, rawSentences.length);

    let longestSentenceWords = 0;
    let fragmentedSentenceCount = 0;

    rawSentences.forEach((s) => {
      const sWords = s.trim().split(/\s+/).filter(Boolean).length;
      if (sWords > longestSentenceWords) longestSentenceWords = sWords;
      if (sWords < 3 || s.includes('...')) fragmentedSentenceCount++;
    });

    const averageWordsPerSentence = Math.round((wordCount / sentenceCount) * 10) / 10;

    return {
      sentenceCount,
      averageWordsPerSentence,
      longestSentenceWords,
      fragmentedSentenceCount,
    };
  }

  /**
   * Synthesize high-level communication assessment.
   */
  private static assessCommunication(
    filler: FillerWordsResult,
    repetition: RepetitionsResult,
    pace: SpeechPaceResult,
    confidence: ConfidenceMarkersResult
  ): CommunicationAssessmentResult {
    // Clarity
    let clarity: 'excellent' | 'good' | 'fair' | 'needs_work' = 'good';
    if (filler.ratePer100Words <= 2.0 && repetition.count === 0) {
      clarity = 'excellent';
    } else if (filler.ratePer100Words > 6.0 || repetition.count >= 3) {
      clarity = 'needs_work';
    } else if (filler.ratePer100Words > 4.0) {
      clarity = 'fair';
    }

    // Conciseness
    let conciseness: 'concise' | 'moderate' | 'verbose' = 'moderate';
    if (pace.wordsPerMinute && pace.wordsPerMinute > 175) {
      conciseness = 'verbose';
    } else if (filler.ratePer100Words < 2.5 && confidence.confidenceRatio >= 0.75) {
      conciseness = 'concise';
    }

    // Fluency
    let fluency: 'fluent' | 'good' | 'hesitant' = 'good';
    if (filler.ratePer100Words <= 2.5 && repetition.count === 0 && pace.classification === 'normal') {
      fluency = 'fluent';
    } else if (filler.ratePer100Words > 5.0 || repetition.count >= 2) {
      fluency = 'hesitant';
    }

    return { clarity, conciseness, fluency };
  }

  /**
   * Generate 2 to 4 actionable communication recommendations based strictly on data.
   */
  private static generateRecommendations(
    filler: FillerWordsResult,
    repetition: RepetitionsResult,
    falseStart: FalseStartsResult,
    pace: SpeechPaceResult,
    confidence: ConfidenceMarkersResult
  ): string[] {
    const recs: string[] = [];

    if (filler.ratePer100Words >= 4.0) {
      const topFillers = Object.entries(filler.breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([w]) => `"${w}"`)
        .join(' and ');
      recs.push(`Reduce frequent verbal filler sounds (${topFillers || 'um/uh'}) by pausing silently for 1–2 seconds before transitioning between points.`);
    }

    if (repetition.count >= 2) {
      recs.push('Practice deliberate speech pacing to minimize immediate word restarts.');
    }

    if (falseStart.count >= 1) {
      recs.push('Formulate the core architectural thought before beginning your sentence to avoid abandoning constructions mid-stream.');
    }

    if (confidence.uncertaintyCount >= 2 && confidence.confidenceRatio < 0.6) {
      recs.push('Frame technical contributions using definitive language ("I implemented", "I resolved") instead of softening qualifiers ("I think", "maybe").');
    }

    if (pace.classification === 'fast' || pace.classification === 'very_fast') {
      recs.push(`Your speaking pace (${pace.wordsPerMinute} WPM) is rapid. Slightly modulate your cadence to ensure complex technical explanations remain clear.`);
    } else if (pace.classification === 'slow') {
      recs.push(`Your speaking pace (${pace.wordsPerMinute} WPM) is on the slower side. Aim for a brisk, conversational cadence around 110–140 WPM.`);
    }

    // Fallback recommendation if speech was already clean
    if (recs.length === 0) {
      recs.push('Maintain your clear, structured cadence and direct technical articulation.');
      recs.push('Continue utilizing action-oriented language when discussing project impact.');
    }

    return recs.slice(0, 4);
  }

  /**
   * LLM enrichment for actionable recommendations (optional enhancement).
   */
  private static async enrichRecommendationsWithLLM(
    transcript: string,
    data: SpeechAnalysisResult
  ): Promise<string[] | null> {
    const prompt = `You are an executive speech and technical interview coach.
A candidate spoke the following verified response:
"${transcript.substring(0, 600)}"

Analysis metrics:
- Filler Rate: ${data.fillerWords.ratePer100Words} per 100 words (${data.fillerWords.total} total: ${JSON.stringify(data.fillerWords.breakdown)})
- Repetitions: ${data.repetitions.count}
- False Starts: ${data.falseStarts.count}
- Speaking Pace: ${data.speechPace.wordsPerMinute || 'unavailable'} WPM (${data.speechPace.classification})
- Uncertainty Markers: ${data.confidenceMarkers.uncertaintyCount}
- Confidence Markers: ${data.confidenceMarkers.confidenceCount}

Generate 2-3 concise, actionable, professional coaching recommendations for this candidate.
STRICT RULES:
1. Do NOT make psychological claims (e.g. do not say "you are nervous" or "lacks confidence").
2. Focus strictly on communication delivery, cadence, and language clarity.
3. Return ONLY a valid JSON array of strings: ["recommendation 1", "recommendation 2"]`;

    const text = await callGroq([
      { role: 'system', content: 'You are an objective executive communication coach. Return JSON string array only.' },
      { role: 'user', content: prompt },
    ], 250);

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(text.substring(start, end + 1));
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        return parsed.slice(0, 3);
      }
    }
    return null;
  }

  /**
   * Aggregate speech analyses across multiple session responses for interview-level summary.
   */
  static aggregateSessionSpeech(analyses: SpeechAnalysisResult[]): any {
    const valid = (analyses || []).filter((a) => a && (a.status === 'completed' || a.metadata?.status === 'completed'));
    if (valid.length === 0) {
      return {
        totalResponses: 0,
        totalFillerWords: 0,
        totalFillerCount: 0,
        averageFillerRate: 0,
        averageFillerRatePer100Words: 0,
        topFillers: {},
        topFillerWords: [],
        averageWpm: null,
        averageWPM: null,
        paceClassification: 'unavailable',
        totalRepetitions: 0,
        totalFalseStarts: 0,
        overallClarity: 'fair',
        overallFluency: 'good',
        totalConfidenceMarkers: 0,
        totalUncertaintyMarkers: 0,
        coachingRecommendations: ['Practice speaking clearly into the microphone with structured cadence.'],
        overallRecommendations: ['Practice speaking clearly into the microphone with structured cadence.'],
      };
    }

    let totalFillers = 0;
    let sumFillerRates = 0;
    const combinedBreakdown: Record<string, number> = {};
    let totalRepetitions = 0;
    let totalFalseStarts = 0;
    let sumWPM = 0;
    let wpmCount = 0;
    let totalConfidence = 0;
    let totalUncertainty = 0;

    valid.forEach((a) => {
      totalFillers += a.fillerWords?.total || 0;
      sumFillerRates += a.fillerWords?.ratePer100Words || 0;
      totalRepetitions += a.repetitions?.count || 0;
      totalFalseStarts += a.falseStarts?.count || 0;
      totalConfidence += a.confidenceMarkers?.confidenceCount || 0;
      totalUncertainty += a.confidenceMarkers?.uncertaintyCount || 0;

      if (typeof a.speechPace?.wordsPerMinute === 'number') {
        sumWPM += a.speechPace.wordsPerMinute;
        wpmCount++;
      }

      if (a.fillerWords?.breakdown) {
        Object.entries(a.fillerWords.breakdown).forEach(([word, count]) => {
          combinedBreakdown[word] = (combinedBreakdown[word] || 0) + count;
        });
      }
    });

    const averageFillerRatePer100Words = Math.round((sumFillerRates / valid.length) * 10) / 10;
    const averageWPM = wpmCount > 0 ? Math.round(sumWPM / wpmCount) : null;

    let overallFluency: 'fluent' | 'good' | 'hesitant' = 'good';
    if (averageFillerRatePer100Words <= 2.5 && totalRepetitions <= 1) {
      overallFluency = 'fluent';
    } else if (averageFillerRatePer100Words > 5.0 || totalRepetitions >= 3) {
      overallFluency = 'hesitant';
    }

    let paceClassification: 'slow' | 'normal' | 'fast' | 'very_fast' | 'unavailable' = 'unavailable';
    if (averageWPM !== null) {
      if (averageWPM < 90) paceClassification = 'slow';
      else if (averageWPM <= 160) paceClassification = 'normal';
      else if (averageWPM <= 190) paceClassification = 'fast';
      else paceClassification = 'very_fast';
    }

    const topFillerWords = Object.entries(combinedBreakdown)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const allRecs = valid.flatMap((a) => a.recommendations || []);
    const uniqueRecs = [...new Set(allRecs)].slice(0, 4);

    return {
      totalResponses: valid.length,
      totalFillerWords: totalFillers,
      totalFillerCount: totalFillers,
      averageFillerRate: averageFillerRatePer100Words,
      averageFillerRatePer100Words,
      topFillers: combinedBreakdown,
      topFillerWords,
      averageWpm: averageWPM,
      averageWPM,
      paceClassification,
      totalRepetitions,
      totalFalseStarts,
      overallClarity: 'good',
      overallFluency,
      totalConfidenceMarkers: totalConfidence,
      totalUncertaintyMarkers: totalUncertainty,
      coachingRecommendations: uniqueRecs,
      overallRecommendations: uniqueRecs,
    };
  }
}
