import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import {
  speakQuestionText,
  stopSpeech,
  initSpeechEngine,
  isSpeechEngineReady,
  waitForSpeechReady,
  type VoiceState,
} from '../../services/hrSpeechService';

export type AvatarState = 'IDLE' | 'INTRODUCING' | 'ASKING' | 'LISTENING' | 'THINKING' | 'FOLLOW_UP' | 'COMPLETED';

interface HRAvatarProps {
  state: AvatarState;
  questionId?: string;
  question?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onSpeakComplete?: () => void;
  onPlaybackStarted?: () => void;
  onPlaybackFailed?: () => void;
}

export const HRAvatar: React.FC<HRAvatarProps> = ({
  state,
  questionId,
  question,
  isMuted: propIsMuted,
  onToggleMute,
  onSpeakComplete,
  onPlaybackStarted,
  onPlaybackFailed,
}) => {
  const [internalMuted, setInternalMuted] = useState(false);
  const isMuted = propIsMuted !== undefined ? propIsMuted : internalMuted;
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [speechReady, setSpeechReady] = useState<boolean>(isSpeechEngineReady());
  const [startupRetryCount, setStartupRetryCount] = useState(0);

  const confirmedSpokenQuestionIdRef = useRef<string | null>(null);
  const activeAttemptQuestionIdRef = useRef<string | null>(null);
  const currentQuestionTextRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  const isSpeaking = voiceState === 'PLAYING';

  // Mount diagnostic log & StrictMode-safe lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[HR-TTS-TRACE] HR_AVATAR_MOUNT');
    console.log('[HR-TTS-TRACE] QUESTION_ID:', questionId);
    console.log('[HR-TTS-TRACE] QUESTION_TEXT:', question ? question.substring(0, 60) + '...' : '(none)');
    console.log('[HR-TTS-TRACE] SPEECH_READY:', speechReady);
    console.log('[HR-TTS-TRACE] VOICES_COUNT:', typeof window !== 'undefined' ? window.speechSynthesis?.getVoices().length : 0);
    console.log('[HR-TTS-TRACE] SYNTH_SPEAKING:', typeof window !== 'undefined' ? window.speechSynthesis?.speaking : false);
    console.log('[HR-TTS-TRACE] SYNTH_PENDING:', typeof window !== 'undefined' ? window.speechSynthesis?.pending : false);
    console.log('[HR-TTS-TRACE] SYNTH_PAUSED:', typeof window !== 'undefined' ? window.speechSynthesis?.paused : false);

    if (!speechReady) {
      waitForSpeechReady().then((ready) => {
        if (isMountedRef.current) {
          console.log('[HR-TTS-TRACE] SPEECH_READY:', ready);
          setSpeechReady(true);
        }
      });
    }

    return () => {
      console.log('[HR-TTS-TRACE] HR_AVATAR_UNMOUNT_CLEANUP');
      isMountedRef.current = false;
      // In React StrictMode (development), an immediate remount occurs within 0-5ms.
      // Defers cancellation so that React StrictMode simulated remount does not cancel in-flight audio.
      // If the component truly unmounted (real navigation away), stopSpeech() is executed.
      setTimeout(() => {
        if (!isMountedRef.current) {
          console.log('[HR-TTS-TRACE] REAL_UNMOUNT_STOP_SPEECH');
          stopSpeech(false);
        }
      }, 150);
    };
  }, []);

  const triggerSpeak = (text: string, qId: string) => {
    if (!text || isMuted) return;

    console.log('[HR-TTS-TRACE] AUTO_SPEAK_REQUEST');
    activeAttemptQuestionIdRef.current = qId;

    speakQuestionText(
      text,
      {
        onStart: () => {
          console.log('[HR-TTS-TRACE] ONSTART');
          // ONLY mark as spoken when onstart confirms actual audio playback!
          confirmedSpokenQuestionIdRef.current = qId;
          activeAttemptQuestionIdRef.current = null;
          onPlaybackStarted?.();
        },
        onEnd: () => {
          console.log('[HR-TTS-TRACE] ONEND');
          activeAttemptQuestionIdRef.current = null;
          onSpeakComplete?.();
        },
        onError: (err) => {
          console.warn('[HR-TTS-TRACE] ONERROR in HRAvatar:', err);
          activeAttemptQuestionIdRef.current = null;
          // Notice: confirmedSpokenQuestionIdRef is NOT set, so question remains retryable!
          onPlaybackFailed?.();

          // Controlled one-time startup retry if speech failed during initial browser priming
          if (startupRetryCount === 0) {
            console.log('[HR-TTS-TRACE] Controlled startup retry...');
            setStartupRetryCount(1);
            setTimeout(() => {
              if (isMountedRef.current && confirmedSpokenQuestionIdRef.current !== qId) {
                initSpeechEngine('controlled-startup-retry');
                triggerSpeak(text, qId);
              }
            }, 300);
          }
        },
        onStateChange: (vs) => {
          setVoiceState(vs);
        },
      },
      { isMuted }
    );
  };

  // Safe question auto-trigger: responds to BOTH question availability AND speech engine readiness
  useEffect(() => {
    console.log('[HR-TTS-TRACE] AUTO_SPEAK_EFFECT_RUN');
    console.log('[HR-TTS-TRACE] QUESTION_ID:', questionId);
    console.log('[HR-TTS-TRACE] QUESTION_TEXT:', question ? question.substring(0, 60) + '...' : '(none)');
    console.log('[HR-TTS-TRACE] SPEECH_READY:', speechReady);
    console.log('[HR-TTS-TRACE] VOICES_COUNT:', typeof window !== 'undefined' ? window.speechSynthesis?.getVoices().length : 0);
    console.log('[HR-TTS-TRACE] SYNTH_SPEAKING:', typeof window !== 'undefined' ? window.speechSynthesis?.speaking : false);
    console.log('[HR-TTS-TRACE] SYNTH_PENDING:', typeof window !== 'undefined' ? window.speechSynthesis?.pending : false);
    console.log('[HR-TTS-TRACE] SYNTH_PAUSED:', typeof window !== 'undefined' ? window.speechSynthesis?.paused : false);

    if (!question || !questionId) return;

    currentQuestionTextRef.current = question;

    if (isMuted) {
      stopSpeech(false);
      setVoiceState('MUTED');
      return;
    }

    // If this question has NOT been confirmed spoken yet:
    if (confirmedSpokenQuestionIdRef.current !== questionId) {
      if (!speechReady) {
        console.log('[HR-TTS-TRACE] WAITING_FOR_TTS_READY before speaking...');
        setVoiceState('LOADING');
        return;
      }

      // If an active attempt is currently already in flight for this exact question, don't duplicate
      if (activeAttemptQuestionIdRef.current === questionId && (voiceState === 'LOADING' || voiceState === 'PLAYING')) {
        console.log('[HR-TTS-TRACE] Speech already in flight for this question, awaiting onstart/playback');
        return;
      }

      triggerSpeak(question, questionId);
    }
  }, [questionId, question, speechReady, isMuted, startupRetryCount]);

  // Safety Watchdog: Prevent persistent "Preparing Question..." state (Rule 7)
  useEffect(() => {
    if (voiceState === 'LOADING') {
      const timer = setTimeout(() => {
        if (voiceState === 'LOADING') {
          console.warn('[Q1-TTS] Preparing state timeout exceeded, transitioning to BLOCKED fallback');
          setVoiceState('BLOCKED');
          activeAttemptQuestionIdRef.current = null;
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [voiceState]);

  // Handle completion speech
  useEffect(() => {
    if (state === 'COMPLETED') {
      const completionText =
        'The interview is now complete. Thank you for your time. Your responses are being evaluated.';
      triggerSpeak(completionText, 'completed');
    }
  }, [state]);

  // Handle mute state changes
  useEffect(() => {
    if (isMuted) {
      stopSpeech(false);
      setVoiceState('MUTED');
    } else if (voiceState === 'MUTED') {
      setVoiceState('IDLE');
    }
  }, [isMuted]);

  const handleMuteToggle = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setInternalMuted((m) => {
        const next = !m;
        if (next) {
          stopSpeech(false);
          setVoiceState('MUTED');
        }
        return next;
      });
    }
  };

  const handleRepeat = () => {
    const textToSpeak = currentQuestionTextRef.current || question;
    if (textToSpeak && questionId) {
      console.log('[HR-TTS-TRACE] Repeat clicked for questionId:', questionId);
      initSpeechEngine('manual-repeat');
      confirmedSpokenQuestionIdRef.current = null;
      activeAttemptQuestionIdRef.current = null;
      triggerSpeak(textToSpeak, questionId);
    }
  };

  const handlePlayQuestion = () => {
    const textToSpeak = currentQuestionTextRef.current || question;
    if (textToSpeak && questionId) {
      console.log('[HR-TTS-TRACE] Manual Play clicked');
      console.log('[HR-TTS-TRACE] Current question ID:', questionId);
      console.log('[HR-TTS-TRACE] Current question text:', textToSpeak);
      console.log('[HR-TTS-TRACE] isMuted:', isMuted);
      console.log('[HR-TTS-TRACE] speechSynthesis.speaking:', typeof window !== 'undefined' ? window.speechSynthesis?.speaking : false);
      console.log('[HR-TTS-TRACE] speechSynthesis.pending:', typeof window !== 'undefined' ? window.speechSynthesis?.pending : false);
      console.log('[HR-TTS-TRACE] speechSynthesis.paused:', typeof window !== 'undefined' ? window.speechSynthesis?.paused : false);
      console.log('[HR-TTS-TRACE] voices count:', typeof window !== 'undefined' ? window.speechSynthesis?.getVoices().length : 0);

      initSpeechEngine('manual-play-question');
      confirmedSpokenQuestionIdRef.current = null;
      activeAttemptQuestionIdRef.current = null;
      triggerSpeak(textToSpeak, questionId);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Centered Circular Avatar Container with subtle visual emphasis ring */}
      <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mb-3">
        {/* Outer animated emphasis ring */}
        <div
          className={`absolute -inset-2 rounded-full border-2 transition-all duration-500 ${
            isSpeaking
              ? 'border-indigo-500/40 scale-105 animate-pulse ring-4 ring-indigo-500/10'
              : 'border-slate-200 scale-100'
          }`}
        />

        {/* Circular Avatar Frame */}
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-300 shadow-md bg-slate-900 relative z-10 flex items-center justify-center">
          <svg viewBox="0 0 160 160" className="w-full h-full object-cover" aria-label="Professional Male AI Interviewer">
            <defs>
              <linearGradient id="maleBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>
              <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="tieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#3730a3" />
              </linearGradient>
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Studio Dark Background */}
            <circle cx="80" cy="80" r="80" fill="url(#maleBgGrad)" />

            {/* Subtle Studio Backlight */}
            <circle cx="80" cy="65" r="48" fill="#4f46e5" opacity="0.18" />

            {/* Suit Shoulders & Torso */}
            <path d="M 20 160 C 20 126, 42 116, 62 114 L 98 114 C 118 116, 140 126, 140 160 Z" fill="url(#suitGrad)" />

            {/* White Dress Shirt Collar */}
            <path d="M 64 114 L 80 135 L 96 114 Z" fill="#ffffff" />
            <path d="M 60 114 L 75 116 L 73 130 Z" fill="#e2e8f0" />
            <path d="M 100 114 L 85 116 L 87 130 Z" fill="#e2e8f0" />

            {/* Professional Silk Tie */}
            <path d="M 76 122 L 84 122 L 86 160 L 74 160 Z" fill="url(#tieGrad)" />
            <polygon points="76,122 84,122 83,128 77,128" fill="#6366f1" />

            {/* Suit Lapels */}
            <path d="M 44 120 L 66 142 L 60 160 L 30 160 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
            <path d="M 116 120 L 94 142 L 100 160 L 130 160 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />

            {/* Neck */}
            <rect x="71" y="90" width="18" height="26" rx="4" fill="#fcd34d" />
            <path d="M 71 90 Q 80 97 89 90 L 89 95 Q 80 101 71 95 Z" fill="#d97706" opacity="0.4" />

            {/* Male Face Contour */}
            <path d="M 54 62 C 54 44, 106 44, 106 62 C 106 82, 94 98, 80 98 C 66 98, 54 82, 54 62 Z" fill="#fde047" />

            {/* Ears */}
            <circle cx="53" cy="65" r="7" fill="#fde047" />
            <circle cx="107" cy="65" r="7" fill="#fde047" />

            {/* Professional Side-Part Male Hair */}
            <path d="M 52 56 C 52 30, 70 24, 88 24 C 104 24, 110 32, 110 46 C 104 42, 96 40, 84 42 C 72 44, 60 48, 52 56 Z" fill="url(#hairGrad)" />
            <path d="M 52 56 C 53 46, 58 40, 68 36 C 60 42, 55 48, 53 58 Z" fill="#1e293b" />

            {/* Male Eyebrows */}
            <path d="M 61 54 Q 69 52 75 55" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 85 55 Q 91 52 99 54" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Eyes */}
            <ellipse cx="68" cy="63" rx="3.8" ry="3" fill="#0f172a" />
            <ellipse cx="92" cy="63" rx="3.8" ry="3" fill="#0f172a" />
            {/* Eye reflections */}
            <circle cx="69" cy="62" r="1" fill="#ffffff" />
            <circle cx="93" cy="62" r="1" fill="#ffffff" />

            {/* Glasses / Modern Spectacles */}
            <rect x="59" y="56" width="18" height="13" rx="3" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
            <rect x="83" y="56" width="18" height="13" rx="3" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
            <path d="M 77 62 L 83 62" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none" />

            {/* Nose */}
            <path d="M 80 63 L 78 74 L 83 74" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Mouth — animated when speaking */}
            {isSpeaking ? (
              <ellipse cx="80" cy="84" rx="4.5" ry="3.5" fill="#991b1b">
                <animate attributeName="ry" values="2;4.5;2.5;5;2" dur="0.35s" repeatCount="indefinite" />
              </ellipse>
            ) : (
              <path d="M 74 84 Q 80 88 86 84" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}

            {/* Executive Smart Headset & Mic */}
            <path d="M 107 65 C 107 72, 104 80, 96 86 L 88 89" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="87" cy="89" r="2.5" fill="#334155" />
            <circle cx="87" cy="89" r="1.5" fill={isSpeaking ? '#22c55e' : '#6366f1'}>
              {isSpeaking && <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />}
            </circle>
          </svg>
        </div>

        {/* Dynamic Voice Wave Bars */}
        {isSpeaking && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 z-20 bg-white/95 px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 bg-indigo-600 rounded-full animate-pulse"
                style={{
                  height: `${8 + (i % 3) * 6}px`,
                  animationDuration: `${0.4 + i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Asking Question / Voice State Indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            voiceState === 'PLAYING'
              ? 'bg-indigo-600 animate-pulse'
              : voiceState === 'LOADING'
              ? 'bg-indigo-400 animate-pulse'
              : voiceState === 'BLOCKED' || voiceState === 'ERROR'
              ? 'bg-amber-500'
              : isMuted
              ? 'bg-slate-400'
              : state === 'LISTENING'
              ? 'bg-emerald-600 animate-pulse'
              : state === 'THINKING'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-emerald-500'
          }`}
        />
        <span
          className={`text-xs font-semibold tracking-tight ${
            voiceState === 'PLAYING'
              ? 'text-indigo-900'
              : voiceState === 'BLOCKED' || voiceState === 'ERROR'
              ? 'text-amber-800'
              : isMuted
              ? 'text-slate-600'
              : 'text-[#0F172A]'
          }`}
        >
          {voiceState === 'PLAYING'
            ? '● Asking Question'
            : voiceState === 'LOADING'
            ? '● Preparing Question…'
            : voiceState === 'BLOCKED' || voiceState === 'ERROR'
            ? 'Voice unavailable — Read the question and continue'
            : isMuted
            ? 'Voice Muted'
            : state === 'LISTENING'
            ? '● Listening…'
            : state === 'THINKING'
            ? '● Analyzing…'
            : state === 'COMPLETED'
            ? '● Interview Complete'
            : '● Ready for your response'}
        </span>
      </div>

      {/* Voice Controls: Play Question (Fallback if Blocked) + Mute Voice & Repeat */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(voiceState === 'BLOCKED' || voiceState === 'ERROR') && (
          <button
            type="button"
            onClick={handlePlayQuestion}
            title="Click to enable and play question audio"
            className="h-7 px-2.5 text-xs font-semibold rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Play Question</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleMuteToggle}
          title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
          className={`h-7 px-2.5 text-xs font-semibold rounded-md border shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            isMuted
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-[#64748B]" />}
          <span>{isMuted ? 'Voice Muted' : 'Mute Voice'}</span>
        </button>

        {question && (
          <button
            type="button"
            onClick={handleRepeat}
            title="Repeat the question audio"
            className="h-7 px-2.5 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Repeat</span>
          </button>
        )}
      </div>
    </div>
  );
};
