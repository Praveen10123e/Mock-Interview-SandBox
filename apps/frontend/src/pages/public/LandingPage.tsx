import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/AuthStore';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { LandingRoundsTimeline } from './components/LandingRoundsTimeline';
import { LandingAptitudePreview } from './components/LandingAptitudePreview';
import { LandingCodingPreview } from './components/LandingCodingPreview';
import { LandingMultiFactorScoring } from './components/LandingMultiFactorScoring';
import { LandingHRInterviewPreview } from './components/LandingHRInterviewPreview';
import { LandingEvidenceLineage } from './components/LandingEvidenceLineage';
import { LandingReportPreview } from './components/LandingReportPreview';
import { LandingCodingInsights } from './components/LandingCodingInsights';
import { LandingPracticeDomains } from './components/LandingPracticeDomains';
import { LandingPipelineJourney } from './components/LandingPipelineJourney';
import { LandingFinalCTA } from './components/LandingFinalCTA';
import { LandingFooter } from './components/LandingFooter';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleStartMockInterview = () => {
    if (user) {
      const role = user.roles?.[0] || 'STUDENT';
      if (role === 'STUDENT') navigate('/student/interviews');
      else if (role === 'FACULTY') navigate('/faculty/dashboard');
      else navigate('/admin/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleExplorePracticeBank = (category?: string) => {
    if (user) {
      if (category) {
        navigate(`/student/practice?category=${encodeURIComponent(category)}`);
      } else {
        navigate('/student/practice');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-geist antialiased selection:bg-slate-900 selection:text-white overflow-x-hidden flex flex-col">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section with Natural Water Caustics WebGL & 3D Emerge IDE */}
        <LandingHero
          onStartMockInterview={handleStartMockInterview}
          onExplorePracticeBank={() => handleExplorePracticeBank()}
        />

        {/* 3. Section 01: The Complete Mock Interview (Three Rounds) */}
        <LandingRoundsTimeline />

        {/* 4. Section 02: Round 01 Aptitude Assessment UI */}
        <LandingAptitudePreview />

        {/* 5. Section 03: Round 02 Live Coding Judge0 Environment */}
        <LandingCodingPreview />

        {/* 6. Section 04: Multi-Factor Coding Scoring Dashboard */}
        <LandingMultiFactorScoring />

        {/* 7. Section 05: Round 03 AI Behavioral HR Interview with Voice Telemetry */}
        <LandingHRInterviewPreview />

        {/* 8. Section 06: Evidence-Based Evaluation Lineage */}
        <LandingEvidenceLineage />

        {/* 9. Section 07: Candidate Performance Report */}
        <LandingReportPreview />

        {/* 10. Section 08: Coding Insights & Anti-Pattern Diagnostic Telemetry */}
        <LandingCodingInsights />

        {/* 11. Section 09: Practice Before You Perform */}
        <LandingPracticeDomains
          onExplorePractice={(category) => handleExplorePracticeBank(category)}
        />

        {/* 12. Section 10: End-to-End Pipeline Journey */}
        <LandingPipelineJourney />

        {/* 13. Final Call to Action with Water Shader */}
        <LandingFinalCTA
          onStartMockInterview={handleStartMockInterview}
          onExplorePracticeBank={() => handleExplorePracticeBank()}
        />
      </main>

      {/* 14. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
