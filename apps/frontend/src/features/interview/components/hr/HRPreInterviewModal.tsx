import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, Wifi, Volume2, Camera, Mic, Monitor } from 'lucide-react';

interface CheckItem {
  id: string;
  label: string;
  status: 'pending' | 'checking' | 'pass' | 'fail';
  hint?: string;
}

interface HRPreInterviewModalProps {
  onProceed: () => void;
  onCancel: () => void;
}

const GUIDELINES = [
  'Find a quiet, well-lit environment with minimal background distractions.',
  'Speak clearly at a natural conversational pace — responses are transcribed live.',
  'Structure all answers using the STAR framework: Situation → Task → Action → Result.',
  'Be honest and specific; the AI interviewer values depth over generic responses.',
];

const initialChecks: CheckItem[] = [
  { id: 'browser', label: 'Browser Compatibility (Chrome / Edge / Firefox)', status: 'pending' },
  { id: 'network', label: 'Network Connectivity', status: 'pending' },
  { id: 'camera', label: 'Camera Permission', status: 'pending' },
  { id: 'microphone', label: 'Microphone Permission', status: 'pending' },
  { id: 'display', label: 'Display Resolution', status: 'pending' },
];

export const HRPreInterviewModal: React.FC<HRPreInterviewModalProps> = ({ onProceed, onCancel }) => {
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks);
  const [allPassed, setAllPassed] = useState(false);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const updated = [...initialChecks];

    const setStatus = (id: string, status: CheckItem['status'], hint?: string) => {
      const idx = updated.findIndex((c) => c.id === id);
      if (idx !== -1) updated[idx] = { ...updated[idx], status, hint };
      setChecks([...updated]);
    };

    // 1. Browser check
    setStatus('browser', 'checking');
    await delay(400);
    const ua = navigator.userAgent;
    const isSupportedBrowser = /Chrome|Edg|Firefox/.test(ua);
    setStatus('browser', isSupportedBrowser ? 'pass' : 'fail', isSupportedBrowser ? undefined : 'Please use Chrome, Edge, or Firefox for best compatibility.');

    // 2. Network
    setStatus('network', 'checking');
    await delay(300);
    const online = navigator.onLine;
    setStatus('network', online ? 'pass' : 'fail', online ? undefined : 'No network connection detected. Please check your internet.');

    // 3. Camera
    setStatus('camera', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus('camera', 'pass');
    } catch {
      setStatus('camera', 'fail', 'Camera permission denied or no camera available. Grant access in browser settings.');
    }
    await delay(200);

    // 4. Microphone
    setStatus('microphone', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus('microphone', 'pass');
    } catch {
      setStatus('microphone', 'fail', 'Microphone permission denied. Please allow microphone access for speech transcription.');
    }
    await delay(200);

    // 5. Display resolution
    setStatus('display', 'checking');
    await delay(200);
    const minWidth = 1024;
    const minHeight = 600;
    const ok = window.screen.width >= minWidth && window.screen.height >= minHeight;
    setStatus('display', ok ? 'pass' : 'fail', ok ? undefined : `Minimum resolution required: ${minWidth}×${minHeight}. Current: ${window.screen.width}×${window.screen.height}`);

    setRunning(false);
    const passed = updated.every((c) => c.status === 'pass');
    setAllPassed(passed);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getIcon = (status: CheckItem['status']) => {
    if (status === 'pass') return <CheckCircle2 size={17} className="hr-check-pass" />;
    if (status === 'fail') return <XCircle size={17} className="hr-check-fail" />;
    if (status === 'checking') return <Loader2 size={17} className="hr-check-spin" />;
    return <div className="hr-check-pending" />;
  };

  const getCheckIcon = (id: string) => {
    const icons: Record<string, React.ReactNode> = {
      browser: <Monitor size={15} />,
      network: <Wifi size={15} />,
      camera: <Camera size={15} />,
      microphone: <Mic size={15} />,
      display: <Volume2 size={15} />,
    };
    return icons[id] || null;
  };

  return (
    <div className="hr-modal-overlay">
      <div className="hr-modal-box">
        {/* Header */}
        <div className="hr-modal-header">
          <h2 className="hr-modal-title">Pre-Interview Checklist</h2>
          <button className="hr-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Content: two columns */}
        <div className="hr-modal-body">
          {/* Left: Guidelines */}
          <div className="hr-modal-col">
            <h3 className="hr-modal-col-title">Interview Guidelines</h3>
            <ul className="hr-guidelines-list">
              {GUIDELINES.map((g, i) => (
                <li key={i} className="hr-guideline-item">
                  <span className="hr-guideline-num">{i + 1}</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: System Checks */}
          <div className="hr-modal-col">
            <div className="hr-modal-col-title-row">
              <h3 className="hr-modal-col-title">System Checks</h3>
              {!running && (
                <button className="hr-recheck-btn" onClick={runChecks}>
                  Re-check
                </button>
              )}
            </div>
            <div className="hr-check-list">
              {checks.map((check) => (
                <div key={check.id} className={`hr-check-item hr-check-${check.status}`}>
                  <div className="hr-check-left">
                    <span className="hr-check-icon-label">{getCheckIcon(check.id)}</span>
                    <div>
                      <p className="hr-check-label">{check.label}</p>
                      {check.status === 'fail' && check.hint && (
                        <p className="hr-check-hint">{check.hint}</p>
                      )}
                    </div>
                  </div>
                  <div className="hr-check-status-icon">{getIcon(check.status)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="hr-modal-footer">
          <button className="hr-modal-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            id="hr-pre-interview-proceed-btn"
            className="hr-modal-proceed-btn"
            onClick={onProceed}
            disabled={running}
          >
            {allPassed ? 'Select Camera & Mic' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
};

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
