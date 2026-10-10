/**
 * hrSpeechService.ts
 *
 * Dedicated Text-to-Speech service for the HR Behavioral Interview module.
 * Implements:
 * 1. Synchronous speech priming on user gestures (autoplay policy unlock)
 * 2. Asynchronous TTS readiness promise (waitForSpeechReady)
 * 3. Chromium cancel() -> resume() -> short delay -> speak() race condition defense
 * 4. Active-only keep-alive timer strictly while playing
 * 5. Verification of actual playback via onstart with a 2000ms timeout detection
 * 6. Robust voice selection and caching
 * 7. Structured diagnostic logging ([Q1-TTS] and [TTS])
 */

export type VoiceState =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYING'
  | 'ENDED'
  | 'BLOCKED'
  | 'ERROR'
  | 'MUTED';

export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onStateChange?: (state: VoiceState) => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentCallbacks: SpeechCallbacks | null = null;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let startTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSpeakTimer: ReturnType<typeof setTimeout> | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let currentVoiceState: VoiceState = 'IDLE';
let isSpeechReady = false;
let readyListeners: Array<() => void> = [];

/**
 * Check if the browser SpeechSynthesis engine is ready with voices.
 */
export const isSpeechEngineReady = (): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  if (isSpeechReady || cachedVoices.length > 0) return true;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
    isSpeechReady = true;
    return true;
  }
  return false;
};

/**
 * Wait for the browser SpeechSynthesis voices to be loaded.
 * Ensures Question 1 does not attempt to speak before voices or engine are ready.
 */
export const waitForSpeechReady = (timeoutMs = 2500): Promise<boolean> => {
  if (isSpeechEngineReady()) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('[Q1-TTS] TTS engine readiness timeout reached, proceeding with fallback voices');
        resolve(typeof window !== 'undefined' && 'speechSynthesis' in window);
      }
    }, timeoutMs);

    const onReady = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    readyListeners.push(onReady);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
        isSpeechReady = true;
        onReady();
      }
    }
  });
};

const notifyReadyListeners = () => {
  isSpeechReady = true;
  const listeners = [...readyListeners];
  readyListeners = [];
  listeners.forEach((fn) => fn());
};

// Global proxy for speechSynthesis.cancel to trace any unexpected cancellations
if (typeof window !== 'undefined' && 'speechSynthesis' in window && !(window as any).__hr_tts_trace_patched) {
  (window as any).__hr_tts_trace_patched = true;
  const origCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);
  window.speechSynthesis.cancel = () => {
    const trace = new Error().stack || '';
    const callerLines = trace.split('\n').slice(2, 5).map(l => l.trim()).join(' -> ');
    console.log(`[HR-TTS-TRACE] CANCEL_CALLED ${Date.now()}`);
    console.log(`[HR-TTS-TRACE] CANCEL_REASON: ${callerLines}`);
    return origCancel();
  };
}

// Register Chromium asynchronous voice population listener
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    console.log(`[TTS] Audio loaded / ${cachedVoices.length} voices ready`);
    console.log(`[HR-TTS-TRACE] VOICES_COUNT: ${cachedVoices.length}`);
    notifyReadyListeners();
  };
}

/**
 * Prime and unlock the browser's speech synthesis engine synchronously
 * inside a direct user gesture event handler (e.g. click "Start Assessment").
 */
export const initSpeechEngine = (reason = 'user-gesture'): boolean => {
  console.log(`[HR-TTS-TRACE] INIT_SPEECH_ENGINE_START reason=${reason}`);
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[TTS] Speech synthesis not supported in this browser environment');
    console.log('[HR-TTS-TRACE] INIT_SPEECH_ENGINE_END supported=false');
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    // Check voices immediately
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      cachedVoices = voices;
      notifyReadyListeners();
    }

    // Create a 0-volume silent utterance to unlock speech synthesis on user gesture
    const primer = new SpeechSynthesisUtterance(' ');
    primer.volume = 0.01;
    primer.rate = 1.0;
    primer.pitch = 1.0;
    window.speechSynthesis.speak(primer);
    window.speechSynthesis.resume();

    console.log('[HR-TTS-TRACE] INIT_SPEECH_ENGINE_END supported=true voices=' + (voices ? voices.length : 0));
    return true;
  } catch (err) {
    console.warn('[TTS] Error while priming speech engine:', err);
    console.log('[HR-TTS-TRACE] INIT_SPEECH_ENGINE_END error=' + err);
    return false;
  }
};

/**
 * Preload and cache available voices.
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length > 0) return cachedVoices;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
};

/**
 * Select a preferred professional-sounding English voice.
 */
export const selectBestVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;

  return (
    // 1. Natural / Google US English voices
    voices.find(
      (v) => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Google'))
    ) ||
    // 2. High quality Microsoft or named English male voices
    voices.find(
      (v) =>
        v.lang === 'en-US' &&
        (v.name.includes('David') ||
          v.name.includes('Guy') ||
          v.name.includes('Mark') ||
          v.name.includes('Christopher') ||
          v.name.includes('Male'))
    ) ||
    // 3. Any standard US English voice
    voices.find((v) => v.lang === 'en-US') ||
    // 4. Any English voice
    voices.find((v) => v.lang.startsWith('en')) ||
    // 5. Fallback to default
    voices[0] ||
    null
  );
};

/**
 * Clean up the keep-alive timer.
 * GUARANTEED to only run during active playback.
 */
const clearKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
};

/**
 * Start keep-alive timer strictly after speech onstart has confirmed active playback.
 */
const startKeepAlive = () => {
  clearKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }, 10000);
};

/**
 * Clean up start timeout detection.
 */
const clearStartTimeout = () => {
  if (startTimeoutTimer) {
    clearTimeout(startTimeoutTimer);
    startTimeoutTimer = null;
  }
};

/**
 * Clean up pending deferred speak timer.
 */
const clearPendingSpeak = () => {
  if (pendingSpeakTimer) {
    clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
};

/**
 * Stop any active or queued speech safely.
 */
export const stopSpeech = (notifyState = true) => {
  clearStartTimeout();
  clearKeepAlive();
  clearPendingSpeak();

  if (activeUtterance) {
    activeUtterance.onstart = null;
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}
  }

  if (notifyState && currentVoiceState === 'LOADING') {
    currentCallbacks?.onStateChange?.('IDLE');
  }

  currentVoiceState = 'IDLE';
};

/**
 * Safe speak function implementing:
 * - Chromium cancel -> resume -> 50ms tick -> speak defense
 * - onstart detection with 2000ms timeout
 * - active-only keep-alive
 * - voice state machine transitions
 */
export const speakQuestionText = (
  text: string,
  callbacks?: SpeechCallbacks,
  options?: { isMuted?: boolean }
): void => {
  console.log('[HR-TTS-TRACE] SPEAK_FUNCTION_ENTER');
  console.log('[TTS] Question received:', text ? text.substring(0, 60) + '...' : '(empty)');
  currentCallbacks = callbacks || null;

  // 1. Check browser support
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[TTS] Speech synthesis error: Web Speech API unavailable');
    currentVoiceState = 'ERROR';
    callbacks?.onStateChange?.('ERROR');
    callbacks?.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  // 2. Check if muted
  if (options?.isMuted) {
    console.log('[TTS] Voice is muted, skipping playback');
    stopSpeech(false);
    currentVoiceState = 'MUTED';
    callbacks?.onStateChange?.('MUTED');
    return;
  }

  // 3. Stop previous speech safely if already speaking; otherwise clear timers without canceling idle engine
  const wasSpeaking = activeUtterance !== null || (typeof window !== 'undefined' && (window.speechSynthesis.speaking || window.speechSynthesis.pending));
  if (wasSpeaking) {
    stopSpeech(false);
  } else {
    clearStartTimeout();
    clearKeepAlive();
    clearPendingSpeak();
  }

  if (!text || !text.trim()) {
    currentVoiceState = 'IDLE';
    callbacks?.onStateChange?.('IDLE');
    return;
  }

  console.log('[TTS] Starting question playback');
  currentVoiceState = 'LOADING';
  callbacks?.onStateChange?.('LOADING');

  const executeSpeak = () => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      activeUtterance = utterance;

      // Select suitable voice
      const voices = getAvailableVoices();
      const preferredVoice = selectBestVoice(voices);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.95;
      utterance.pitch = 0.98;
      utterance.volume = 1.0;

      let hasStarted = false;

      // Arm start timeout detection: If onstart does not fire within 2500ms,
      // treat as blocked / failed by browser autoplay policy
      startTimeoutTimer = setTimeout(() => {
        if (!hasStarted) {
          console.warn('[Q1-TTS] playback failed: onstart timeout reached in speakQuestionText');
          clearKeepAlive();
          currentVoiceState = 'BLOCKED';
          callbacks?.onStateChange?.('BLOCKED');
          callbacks?.onError?.(new Error('Autoplay blocked: onstart timeout'));
        }
      }, 2500);

      utterance.onstart = () => {
        hasStarted = true;
        clearStartTimeout();
        console.log('[HR-TTS-TRACE] ONSTART');
        console.log('[TTS] Playback started');
        currentVoiceState = 'PLAYING';
        callbacks?.onStateChange?.('PLAYING');
        callbacks?.onStart?.();

        // Keep-alive MUST ONLY run during active speech!
        startKeepAlive();
      };

      utterance.onend = () => {
        clearStartTimeout();
        clearKeepAlive();
        console.log('[HR-TTS-TRACE] ONEND');
        console.log('[TTS] Playback ended');
        currentVoiceState = 'ENDED';
        callbacks?.onStateChange?.('ENDED');
        callbacks?.onEnd?.();
        activeUtterance = null;
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        clearStartTimeout();
        clearKeepAlive();
        activeUtterance = null;

        // An interrupted or canceled event occurs normally on question change or stop
        if (event.error === 'canceled' || event.error === 'interrupted') {
          console.log('[TTS] Playback cancelled or interrupted');
          currentVoiceState = 'IDLE';
          callbacks?.onStateChange?.('IDLE');
          return;
        }

        console.log('[HR-TTS-TRACE] ONERROR', event.error);
        if (event.error === 'not-allowed') {
          console.warn('[TTS] Browser autoplay blocked (not-allowed)');
          currentVoiceState = 'BLOCKED';
          callbacks?.onStateChange?.('BLOCKED');
          callbacks?.onError?.(event);
        } else {
          console.error(`[TTS] Speech synthesis error: ${event.error}`);
          currentVoiceState = 'ERROR';
          callbacks?.onStateChange?.('ERROR');
          callbacks?.onError?.(event);
        }
      };

      console.log('[HR-TTS-TRACE] UTTERANCE_CREATED');
      console.log(`[HR-TTS-TRACE] VOICES_COUNT: ${voices.length}`);
      console.log(`[HR-TTS-TRACE] SYNTH_SPEAKING: ${window.speechSynthesis.speaking}`);
      console.log(`[HR-TTS-TRACE] SYNTH_PENDING: ${window.speechSynthesis.pending}`);
      console.log(`[HR-TTS-TRACE] SYNTH_PAUSED: ${window.speechSynthesis.paused}`);

      console.log(`[HR-TTS-TRACE] SYNTH_SPEAK_CALLED ${Date.now()}`);
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      // Double resume in microtask and timeout to unstick Chromium WASAPI audio stream
      window.speechSynthesis.resume();
      setTimeout(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.paused || (!hasStarted && window.speechSynthesis.pending)) {
            console.log('[Q1-DEBUG] Unsticking speech synthesis queue via resume()');
            window.speechSynthesis.resume();
          }
        }
      }, 100);
    } catch (err) {
      console.error('[Q1-DEBUG] onerror (exception):', err);
      clearStartTimeout();
      clearKeepAlive();
      activeUtterance = null;
      currentVoiceState = 'ERROR';
      callbacks?.onStateChange?.('ERROR');
      callbacks?.onError?.(err);
    }
  };

  if (wasSpeaking) {
    pendingSpeakTimer = setTimeout(executeSpeak, 40);
  } else {
    executeSpeak();
  }
};

export const getCurrentVoiceState = (): VoiceState => currentVoiceState;
