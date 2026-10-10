import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Camera, Mic, Monitor, Wifi, CheckCircle2, AlertCircle, Play, ShieldAlert } from 'lucide-react';
import { requestAssessmentFullscreen } from '../utils/fullscreen';

export const InterviewLobby: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [checksPassed, setChecksPassed] = useState(false);
  
  const [checkStatus, setCheckStatus] = useState({
    webcam: 'pending',
    mic: 'pending',
    browser: 'pending',
    network: 'pending'
  });
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSystemChecks = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    let allPassed = true;

    // 1. Network Check
    const networkOk = window.navigator.onLine;
    setCheckStatus(prev => ({ ...prev, network: networkOk ? 'passed' : 'failed' }));
    if (!networkOk) allPassed = false;

    // 2. Browser Compatibility
    const browserOk = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setCheckStatus(prev => ({ ...prev, browser: browserOk ? 'passed' : 'failed' }));
    if (!browserOk) {
      allPassed = false;
      setErrorMessage("Your browser does not support required media devices.");
    }

    // 3. Media Devices (Mic & Camera)
    if (browserOk) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setCheckStatus(prev => ({ ...prev, webcam: 'passed', mic: 'passed' }));
        stream.getTracks().forEach(track => track.stop());
      } catch (err: any) {
        allPassed = false;
        setCheckStatus(prev => ({ ...prev, webcam: 'failed', mic: 'failed' }));
        setErrorMessage("Microphone or Webcam unavailable. Please grant browser permissions.");
      }
    }

    setChecksPassed(allPassed);
    setIsChecking(false);
  };

  const handleStartInterview = async () => {
    await requestAssessmentFullscreen();
    navigate(`/student/interviews/session/${id}`);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Pre-flight Diagnostic Check"
        description={`Session: ${id?.substring(0, 12)}... · Verify environment readiness before launching.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Interviews', href: '/student/interviews' },
          { label: 'Pre-flight Lobby' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Instructions & Structure */}
        <div className="space-y-5">
          <Card className="bg-surface/70 border border-white/8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-text-primary">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Assessment Instructions & Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <ul className="list-disc list-inside space-y-1.5">
                <li>This is a proctored assessment session with active window focus telemetry.</li>
                <li>Avoid switching tabs or minimizing the browser window during the assessment.</li>
                <li>Ensure stable internet connectivity to prevent Judge0 execution timeouts.</li>
                <li>Progress systematically through Aptitude, Coding, and HR conversational rounds.</li>
              </ul>
              
              <div className="bg-surface-elevated border border-white/6 rounded-xl p-4 mt-4 space-y-2">
                <h4 className="font-semibold text-xs text-text-primary">Assessment Structure</h4>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-white/4 border border-white/5">
                    <span className="text-[10px] text-text-muted uppercase">Round 1</span>
                    <p className="font-semibold text-xs text-text-primary mt-0.5">Aptitude</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/4 border border-white/5">
                    <span className="text-[10px] text-text-muted uppercase">Round 2</span>
                    <p className="font-semibold text-xs text-text-primary mt-0.5">Coding (2 Qs)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/4 border border-white/5">
                    <span className="text-[10px] text-text-muted uppercase">Round 3</span>
                    <p className="font-semibold text-xs text-text-primary mt-0.5">AI HR</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Diagnostic Controls */}
        <div className="space-y-5">
          <Card className="bg-surface/70 border border-white/8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-text-primary">Hardware & Network Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5">
                {/* 1. Network */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/6 bg-surface-elevated">
                  <div className="flex items-center gap-2.5">
                    <Wifi className="h-4 w-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">Network Connection</span>
                  </div>
                  {checkStatus.network === 'passed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {checkStatus.network === 'failed' && <AlertCircle className="h-4 w-4 text-rose-400" />}
                  {checkStatus.network === 'pending' && <span className="text-[10px] text-text-muted">Not Tested</span>}
                </div>

                {/* 2. Browser */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/6 bg-surface-elevated">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="h-4 w-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">Browser Capability</span>
                  </div>
                  {checkStatus.browser === 'passed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {checkStatus.browser === 'failed' && <AlertCircle className="h-4 w-4 text-rose-400" />}
                  {checkStatus.browser === 'pending' && <span className="text-[10px] text-text-muted">Not Tested</span>}
                </div>

                {/* 3. Camera */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/6 bg-surface-elevated">
                  <div className="flex items-center gap-2.5">
                    <Camera className="h-4 w-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">Webcam Permission</span>
                  </div>
                  {checkStatus.webcam === 'passed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {checkStatus.webcam === 'failed' && <AlertCircle className="h-4 w-4 text-rose-400" />}
                  {checkStatus.webcam === 'pending' && <span className="text-[10px] text-text-muted">Not Tested</span>}
                </div>

                {/* 4. Mic */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/6 bg-surface-elevated">
                  <div className="flex items-center gap-2.5">
                    <Mic className="h-4 w-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">Microphone Permission</span>
                  </div>
                  {checkStatus.mic === 'passed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {checkStatus.mic === 'failed' && <AlertCircle className="h-4 w-4 text-rose-400" />}
                  {checkStatus.mic === 'pending' && <span className="text-[10px] text-text-muted">Not Tested</span>}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2.5">
                <Button 
                  onClick={runSystemChecks} 
                  isLoading={isChecking}
                  variant={checksPassed ? "outline" : "default"}
                  className="w-full"
                >
                  {checksPassed ? "Re-run System Diagnostics" : "Run Diagnostics Check"}
                </Button>

                <Button 
                  onClick={handleStartInterview} 
                  disabled={!checksPassed}
                  size="lg"
                  className="w-full"
                  rightIcon={<Play className="h-4 w-4 fill-current" />}
                >
                  Enter Interview Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewLobby;
