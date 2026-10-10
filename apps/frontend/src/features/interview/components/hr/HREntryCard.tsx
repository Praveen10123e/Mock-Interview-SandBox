import React from 'react';
import { Video, Mic, Brain, MessageSquare, Users, Briefcase, ChevronRight, Star, Clock, Award, Maximize2 } from 'lucide-react';
import { initSpeechEngine } from '../../services/hrSpeechService';
import { requestAssessmentFullscreen } from '../../utils/fullscreen';

interface HREntryCardProps {
  onStart: () => void;
}

const EVALUATED_SKILLS = [
  { icon: MessageSquare, label: 'Communication', color: '#4f46e5' },
  { icon: Brain, label: 'Problem Solving', color: '#7c3aed' },
  { icon: Users, label: 'Teamwork', color: '#0284c7' },
  { icon: Briefcase, label: 'Professionalism', color: '#059669' },
  { icon: Star, label: 'Ownership', color: '#d97706' },
  { icon: Award, label: 'Leadership', color: '#4338ca' },
];

export const HREntryCard: React.FC<HREntryCardProps> = ({ onStart }) => {
  const handleStart = () => {
    console.log('[HR-TTS-TRACE] START_ASSESSMENT_CLICK');
    console.log('[HR-TTS-TRACE] INIT_SPEECH_ENGINE_START');
    // Prime and unlock browser SpeechSynthesis directly on trusted user gesture
    initSpeechEngine('start-assessment-click');
    console.log('[HR-TTS-TRACE] INIT_SPEECH_ENGINE_END');

    // Ensure assessment fullscreen is active
    requestAssessmentFullscreen().catch((e) => console.warn('Fullscreen check warning:', e));

    // Synchronous transition within the user gesture event
    onStart();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-0 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 max-w-2xl w-full shadow-xs">
        {/* Header */}
        <div className="text-center pb-5 mb-5 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Brain className="w-3.5 h-3.5" /> AI Interviewer
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            HR &amp; Behavioral Round
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#64748B] max-w-lg mx-auto leading-relaxed">
            You are about to begin an AI-powered behavioral mock interview. A professional AI
            interviewer will evaluate your communication, problem-solving, and soft skills in full-screen assessment mode.
          </p>
        </div>

        {/* Info Chips Row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#334155]">
            <Briefcase className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Software Engineer</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#334155]">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span>~15 Minutes</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#334155]">
            <MessageSquare className="w-3.5 h-3.5 text-[#64748B]" />
            <span>3–4 Questions</span>
          </div>
        </div>

        {/* Prerequisites & Skills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Prerequisites */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">
              Prerequisites
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Video className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Camera Access</p>
                  <p className="text-[11px] text-[#64748B] leading-tight">Your live webcam stream will be enabled for the interview.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Microphone Access</p>
                  <p className="text-[11px] text-[#64748B] leading-tight">Your answers are recorded and transcribed in real time.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Evaluated */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">
              Skills Evaluated
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {EVALUATED_SKILLS.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#E2E8F0] text-[11px] font-medium text-[#334155]"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 mb-6 text-xs text-[#475569] leading-relaxed">
          <p className="font-semibold text-[#0F172A] mb-1">Assessment Guidelines:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            <li>Click <strong>Start Assessment</strong> to enter the full-screen interview experience.</li>
            <li>Speak clearly and naturally into your microphone when answering each question.</li>
            <li>Use the <strong>STAR method</strong> (Situation, Task, Action, Result) for structured responses.</li>
            <li>You can repeat the question at any time using the <strong>Repeat</strong> button.</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-2">
          <button
            id="hr-start-interview-btn"
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto h-11 px-8 text-sm font-semibold rounded-lg bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer flex items-center justify-center gap-2 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            Start Assessment
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
          <span className="text-[11px] text-[#64748B]">
            Enters full-screen mode. Camera and microphone permissions will be verified.
          </span>
        </div>
      </div>
    </div>
  );
};
