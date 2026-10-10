import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Square, Play, CheckCircle2, ChevronRight,
  Info, LogOut, AlertTriangle, VideoOff, AlertCircle,
  RotateCcw, Sparkles, Loader2
} from 'lucide-react';
import { HRAvatar } from './HRAvatar';
import type { AvatarState } from './HRAvatar';
import { HREvaluationCriteriaModal } from './HREvaluationCriteriaModal';
import { HRInterviewAPI } from '../../services/hrInterview.service';
import type { HRQuestion } from '../../services/hrInterview.service';
import { stopSpeech } from '../../services/hrSpeechService';

interface HRInterviewRoomProps {
  interviewId: string;
  questions: HRQuestion[];
  videoStream: MediaStream | null;
  onComplete: () => void;
  onExit: () => void;
}

export type InterviewStateMachine =
  | 'READY'
  | 'ASKING'
  | 'WAITING_FOR_ANSWER'
  | 'RECORDING'
  | 'PROCESSING'
  | 'FOLLOW_UP'
  | 'COMPLETED'
  | 'ERROR';

type CameraStatus = 'LOADING' | 'SUCCESS' | 'PERMISSION_DENIED' | 'NO_CAMERA' | 'ERROR';

export const HRInterviewRoom: React.FC<HRInterviewRoomProps> = ({
  interviewId,
  questions,
  videoStream: initialVideoStream,
  onComplete,
  onExit,
}) => {
  // Questions list (main + follow-ups)
  const [allQuestions, setAllQuestions] = useState<HRQuestion[]>(
    questions.filter((q) => q.questionType === 'MAIN')
  );
  const [currentIdx, setCurrentIdx] = useState(0);

  // State Machine
  const [interviewState, setInterviewState] = useState<InterviewStateMachine>('READY');
  const [avatarState, setAvatarState] = useState<AvatarState>('ASKING');

  // Video & Media Stream State
  const [activeStream, setActiveStream] = useState<MediaStream | null>(initialVideoStream);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('LOADING');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  // Recording & Transcription
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Modals & Dialogs
  const [showCriteria, setShowCriteria] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [roomError, setRoomError] = useState('');

  // Follow-up question state
  const [followUpQuestion, setFollowUpQuestion] = useState<HRQuestion | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const mainQuestions = allQuestions.filter((q) => q.questionType === 'MAIN');
  const currentQuestion = showFollowUp && followUpQuestion ? followUpQuestion : allQuestions[currentIdx];
  const totalMain = mainQuestions.length;
  const answeredMain = mainQuestions.filter((q) => q.response).length;
  const progressPct = totalMain > 0 ? Math.round((answeredMain / totalMain) * 100) : 0;

  // ── Real Camera Initialization & Error States ───────────────────
  const initCamera = useCallback(async () => {
    setCameraStatus('LOADING');
    setCameraErrorMessage('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('ERROR');
        setCameraErrorMessage('Your browser does not support webcam access.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });

      setActiveStream(stream);
      setCameraStatus('SUCCESS');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video autoplay:', e));
      }
    } catch (err: any) {
      console.error('Camera acquisition error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('PERMISSION_DENIED');
        setCameraErrorMessage('Camera access is blocked. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('NO_CAMERA');
        setCameraErrorMessage('No camera detected on this system.');
      } else {
        setCameraStatus('ERROR');
        setCameraErrorMessage('Unable to access camera. Please check your device permissions.');
      }
    }
  }, []);

  useEffect(() => {
    if (activeStream) {
      setCameraStatus('SUCCESS');
      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch((e) => console.warn('Video autoplay:', e));
      }
    } else {
      initCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [activeStream, initCamera]);

  // Initial State: Reset to ready when question changes; voice lifecycle drives asking state
  useEffect(() => {
    console.log('[HR-TTS-TRACE] QUESTION_RECEIVED');
    console.log('[HR-TTS-TRACE] QUESTION_ID:', currentQuestion?.id);
    console.log('[HR-TTS-TRACE] QUESTION_INDEX:', currentIdx + 1);
    console.log('[HR-TTS-TRACE] QUESTION_TEXT:', currentQuestion?.question);
    setInterviewState('READY');
    setAvatarState('IDLE');
  }, [currentIdx, showFollowUp]);

  // Toggle candidate microphone
  const handleToggleMic = () => {
    if (activeStream) {
      const audioTracks = activeStream.getAudioTracks();
      const willMute = !isMicMuted;
      audioTracks.forEach((t) => {
        t.enabled = !willMute;
      });
      setIsMicMuted(willMute);
    }
  };

  // ── Speech Recognition & Audio Recorder ─────────────────────────
  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    let accumulatedFinal = '';
    recog.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          accumulatedFinal += event.results[i][0].transcript + ' ';
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      setLiveTranscript(accumulatedFinal + interim);
      setTranscript(accumulatedFinal);
    };

    recog.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition event:', e.error);
      }
    };

    return recog;
  };

  // Start candidate answer recording
  const startRecording = () => {
    stopSpeech();
    setRoomError('');
    setLiveTranscript('');
    setTranscript('');
    recordingStartTimeRef.current = Date.now();
    setRecordingSeconds(0);

    // Timer
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
    }, 1000);

    // Candidate mic audio unmuted
    if (activeStream && isMicMuted) {
      activeStream.getAudioTracks().forEach((t) => (t.enabled = true));
      setIsMicMuted(false);
    }

    // MediaRecorder for question-specific video/audio answer evidence
    audioChunksRef.current = [];
    if (activeStream && typeof MediaRecorder !== 'undefined') {
      try {
        const videoTracks = activeStream.getVideoTracks();
        const audioTracks = activeStream.getAudioTracks();
        const tracks = [...videoTracks, ...audioTracks];
        const recordStream = new MediaStream(tracks.length > 0 ? tracks : activeStream.getAudioTracks());

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }

        const recorder = new MediaRecorder(recordStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('MediaRecorder error:', err);
      }
    }

    // Speech recognition
    const recog = setupSpeechRecognition();
    if (recog) {
      recognitionRef.current = recog;
      try {
        recog.start();
      } catch (err) {
        console.warn('Recognition start warning:', err);
      }
    }

    setInterviewState('RECORDING');
    setAvatarState('LISTENING');
  };

  // Stop candidate answer recording & submit response
  const stopRecording = useCallback(async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    try {
      recognitionRef.current?.stop();
    } catch {}

    const activeRecorder = mediaRecorderRef.current;
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
      } catch {}
    }

    const elapsed = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
    setRecordingSeconds(elapsed);
    setInterviewState('PROCESSING');
    setAvatarState('THINKING');
    setIsSubmittingAnswer(true);

    const finalTranscript = (transcript || liveTranscript || '').trim();

    // Prepare recorded blob if available
    const mime = activeRecorder?.mimeType || 'video/webm';
    const recordedBlob = audioChunksRef.current.length > 0
      ? new Blob(audioChunksRef.current, { type: mime })
      : null;

    try {
      if (!currentQuestion) {
        throw new Error('No question currently active');
      }

      // 1. Submit authoritative response & transcript
      const result = await HRInterviewAPI.submitResponse(
        interviewId,
        currentQuestion.id,
        finalTranscript,
        elapsed
      );

      // 2. Upload question-specific answer video evidence (non-blocking for scoring)
      if (recordedBlob && recordedBlob.size > 0) {
        HRInterviewAPI.uploadAnswerMedia(
          interviewId,
          currentQuestion.id,
          recordedBlob,
          elapsed
        ).catch((mediaErr) => {
          console.warn('[HRInterviewRoom] Temporary media evidence upload note:', mediaErr);
        });
      }

      // Update question state as answered
      setAllQuestions((prev) =>
        prev.map((q) =>
          q.id === currentQuestion.id
            ? {
                ...q,
                response: {
                  id: '',
                  transcript: finalTranscript,
                  durationSeconds: elapsed,
                  wordCount: finalTranscript.split(/\s+/).filter(Boolean).length,
                  hasRecording: audioChunksRef.current.length > 0,
                  submittedAt: new Date().toISOString(),
                },
              }
            : q
        )
      );

      // Handle follow-up question if returned by AI
      if (result.followUpQuestion) {
        const fq: HRQuestion = {
          id: result.followUpQuestion.id,
          question: result.followUpQuestion.question,
          category: result.followUpQuestion.category || currentQuestion.category,
          questionType: 'FOLLOW_UP',
          sequence: 99,
          response: null,
        };
        setFollowUpQuestion(fq);
        setShowFollowUp(true);
        setInterviewState('FOLLOW_UP');
        setAvatarState('FOLLOW_UP');
      } else if (result.nextMainQuestion) {
        setShowFollowUp(false);
        setFollowUpQuestion(null);
        setAllQuestions((prev) =>
          prev.map((q) =>
            q.id === result.nextMainQuestion.id
              ? {
                  ...q,
                  question: result.nextMainQuestion.question,
                  category: result.nextMainQuestion.category,
                  difficulty: result.nextMainQuestion.difficulty,
                  competency: result.nextMainQuestion.competency,
                }
              : q
          )
        );
        const nextIdx = allQuestions.findIndex((q) => q.id === result.nextMainQuestion.id);
        if (nextIdx >= 0) {
          setCurrentIdx(nextIdx);
        } else {
          setCurrentIdx((i) => i + 1);
        }
        setInterviewState('ASKING');
        setAvatarState('ASKING');
      } else {
        // All questions completed
        setShowFollowUp(false);
        setInterviewState('COMPLETED');
        setAvatarState('COMPLETED');
      }
    } catch (err: any) {
      console.error('Response submission error:', err);
      setRoomError('Failed to save answer. You can retry recording.');
      setInterviewState('ERROR');
      setAvatarState('ASKING');
    } finally {
      setIsSubmittingAnswer(false);
      setTranscript('');
      setLiveTranscript('');
    }
  }, [interviewId, currentQuestion, transcript, liveTranscript, allQuestions]);

  const handleNextQuestion = () => {
    stopSpeech();
    setShowFollowUp(false);
    setFollowUpQuestion(null);
    if (currentIdx < allQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setInterviewState('READY');
      setAvatarState('IDLE');
    } else {
      setInterviewState('COMPLETED');
      setAvatarState('COMPLETED');
    }
  };

  const handleSkipFollowUp = () => {
    stopSpeech();
    setShowFollowUp(false);
    setFollowUpQuestion(null);
    handleNextQuestion();
  };

  const handleFinish = () => {
    stopSpeech();
    // Exit fullscreen on interview completion
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
    onComplete();
  };

  const handleExitInterview = () => {
    stopSpeech();
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
    onExit();
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      {/* Subtle Progress Bar across top */}
      <div className="h-0.5 bg-[#E2E8F0] shrink-0 w-full">
        <div
          className="h-full bg-[#111827] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Sub-Header Bar: Progress + Category + Criteria + Fullscreen */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-2 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            HR Behavioral Assessment
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold text-[#0F172A]">
            Question {Math.min(answeredMain + 1, totalMain)} of {totalMain}
          </span>
          <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] font-medium">
            {currentQuestion?.category || 'General HR'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCriteria(true)}
            className="h-7 px-2.5 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Evaluation Criteria & STAR Framework"
          >
            <Info className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden md:inline">Evaluation Criteria</span>
          </button>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fullscreen Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="h-7 px-2.5 text-xs font-semibold rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exit HR Round"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Assessment Workspace - Fits Viewport Naturally */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 flex flex-col justify-center">
        <div className="w-full max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch my-auto">

          {/* ──────────────────────────────────────────────────────────── */}
          {/* COLUMN 1: AI INTERVIEWER */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:gap-4 justify-between">
            {/* Column Label */}
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                AI Interviewer
              </span>
            </div>

            {/* AI Avatar Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col items-center justify-center">
              <HRAvatar
                state={avatarState}
                questionId={currentQuestion?.id}
                question={currentQuestion?.question}
                isMuted={isVoiceMuted}
                onToggleMute={() => setIsVoiceMuted((prev) => !prev)}
                onPlaybackStarted={() => {
                  setAvatarState(showFollowUp ? 'FOLLOW_UP' : 'ASKING');
                }}
                onSpeakComplete={() => {
                  setAvatarState('IDLE');
                  setInterviewState('WAITING_FOR_ANSWER');
                }}
                onPlaybackFailed={() => {
                  setAvatarState('IDLE');
                  setInterviewState('WAITING_FOR_ANSWER');
                }}
              />
            </div>

            {/* Question Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#E2E8F0]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    {showFollowUp ? 'AI Follow-up Question' : `Category: ${currentQuestion?.category || 'Behavioral'}`}
                  </span>
                  <span className="text-xs font-medium text-[#64748B]">
                    Question {Math.min(answeredMain + 1, totalMain)} of {totalMain}
                  </span>
                </div>

                <p className="text-base sm:text-lg font-semibold text-[#0F172A] leading-relaxed">
                  {currentQuestion?.question || 'Loading question…'}
                </p>

                {currentQuestion?.response && (
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Response captured ({currentQuestion.response.durationSeconds}s)</span>
                  </div>
                )}
              </div>

              {roomError && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{roomError}</span>
                </div>
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* COLUMN 2: CANDIDATE CAMERA & ANSWER CONTROLS */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:gap-4 justify-between">
            {/* Column Label */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Candidate
              </span>
              {interviewState === 'RECORDING' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  Recording: {formatTimer(recordingSeconds)}
                </span>
              )}
            </div>

            {/* Candidate Real Camera Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-[#E2E8F0] flex items-center justify-center">
                {/* Live Real Video Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    cameraStatus === 'SUCCESS' ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Top Overlay: Live Camera status + Mic toggle */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                  <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-xs border border-white/20 text-white text-xs font-semibold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Camera</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleMic}
                    title={isMicMuted ? 'Unmute candidate microphone' : 'Mute candidate microphone'}
                    className={`pointer-events-auto p-1.5 rounded-full border shadow-2xs transition-colors ${
                      isMicMuted
                        ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                        : 'bg-slate-900/70 text-white border-white/20 hover:bg-slate-900'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Bottom Overlay: Candidate label */}
                <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-xs border border-white/10 text-white/90 text-[11px] font-medium shadow-2xs">
                    You (Candidate)
                  </span>
                </div>

                {/* Camera State: LOADING */}
                {cameraStatus === 'LOADING' && (
                  <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 z-20 text-slate-700">
                    <Loader2 className="w-7 h-7 animate-spin text-[#111827]" />
                    <p className="text-xs font-semibold">Starting Camera...</p>
                  </div>
                )}

                {/* Camera State: PERMISSION DENIED */}
                {cameraStatus === 'PERMISSION_DENIED' && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 text-center z-20 text-slate-800">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-1.5" />
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A]">Camera access is blocked</p>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-[240px] leading-relaxed">
                      Please allow camera access in your browser settings to enable your live video feed.
                    </p>
                    <button
                      type="button"
                      onClick={initCamera}
                      className="mt-3 h-8 px-3.5 text-xs font-semibold rounded-md bg-[#111827] text-white hover:bg-[#1F2937] shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Camera State: NO CAMERA */}
                {cameraStatus === 'NO_CAMERA' && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 text-center z-20 text-slate-800">
                    <VideoOff className="w-8 h-8 text-slate-400 mb-1.5" />
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A]">No camera detected</p>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-[240px] leading-relaxed">
                      Connect a webcam or virtual camera to display your video during the assessment.
                    </p>
                    <button
                      type="button"
                      onClick={initCamera}
                      className="mt-3 h-8 px-3.5 text-xs font-semibold rounded-md bg-[#111827] text-white hover:bg-[#1F2937] shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Camera State: ERROR */}
                {cameraStatus === 'ERROR' && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 text-center z-20 text-slate-800">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-1.5" />
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A]">Unable to access camera</p>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-[240px] leading-relaxed">
                      {cameraErrorMessage || 'An unexpected error occurred while starting your video device.'}
                    </p>
                    <button
                      type="button"
                      onClick={initCamera}
                      className="mt-3 h-8 px-3.5 text-xs font-semibold rounded-md bg-[#111827] text-white hover:bg-[#1F2937] shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Answer Control Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Your Response
                  </span>
                  <div className="flex items-center gap-1.5">
                    {interviewState === 'RECORDING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        Recording
                      </span>
                    ) : currentQuestion?.response ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Answer Captured
                      </span>
                    ) : (
                      <span className="text-xs text-[#64748B]">Ready to answer</span>
                    )}
                  </div>
                </div>

                {/* Live Speech Transcription Box */}
                {interviewState === 'RECORDING' && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-3 text-xs">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                      <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      Live Speech Transcription:
                    </p>
                    <p className="text-slate-600 italic leading-relaxed">
                      {liveTranscript || 'Listening to candidate speech… speak clearly.'}
                    </p>
                  </div>
                )}

                {/* Processing Spinner */}
                {isSubmittingAnswer && (
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 mb-3 text-xs flex items-center gap-2 text-indigo-900">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Evaluating response with AI…</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-[#E2E8F0]">
                {/* State: READY / WAITING_FOR_ANSWER / ASKING */}
                {(interviewState === 'WAITING_FOR_ANSWER' ||
                  interviewState === 'ASKING' ||
                  interviewState === 'READY' ||
                  interviewState === 'ERROR') && (
                  <button
                    id="hr-start-answer-btn"
                    type="button"
                    onClick={startRecording}
                    className="h-10 px-6 text-xs font-semibold rounded-md bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                    Start Answer
                  </button>
                )}

                {/* State: RECORDING */}
                {interviewState === 'RECORDING' && (
                  <button
                    id="hr-stop-answer-btn"
                    type="button"
                    onClick={stopRecording}
                    className="h-10 px-6 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-600 cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop Answer
                  </button>
                )}

                {/* Follow-up Question Actions */}
                {interviewState === 'FOLLOW_UP' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="h-10 px-5 text-xs font-semibold rounded-md bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Answer Follow-up
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipFollowUp}
                      className="h-10 px-4 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      Skip <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                    </button>
                  </div>
                )}

                {/* Answered: Next Question / Finish */}
                {currentQuestion?.response && interviewState !== 'RECORDING' && interviewState !== 'PROCESSING' && (
                  <div className="flex items-center gap-2">
                    {currentIdx < totalMain - 1 ? (
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="h-10 px-6 text-xs font-semibold rounded-md bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer flex items-center gap-2"
                      >
                        Next Question <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        id="hr-finish-btn"
                        type="button"
                        onClick={handleFinish}
                        className="h-10 px-6 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600 cursor-pointer flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Finish &amp; View Results
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={startRecording}
                      className="h-10 px-3.5 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="Re-record your response for this question"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                      Re-record
                    </button>
                  </div>
                )}

                {/* Interview All Done */}
                {interviewState === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="h-10 px-6 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600 cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Assessment
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Criteria Modal */}
      {showCriteria && <HREvaluationCriteriaModal onClose={() => setShowCriteria(false)} />}

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold mb-1 text-slate-900 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600" />
              Exit HR Interview?
            </h3>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              Your answered questions and responses have been safely saved. You can resume later if the assessment deadline has not expired.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-9 rounded-md border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExitInterview}
                className="flex-1 h-9 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Exit Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
