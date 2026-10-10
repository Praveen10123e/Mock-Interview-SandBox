import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface HRMediaDeviceModalProps {
  onReady: (videoStream: MediaStream | null, audioDeviceId: string) => void;
  onBack: () => void;
}

export const HRMediaDeviceModal: React.FC<HRMediaDeviceModalProps> = ({ onReady, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [mics, setMics] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startPreview = async (cameraId?: string, micId?: string) => {
    stopCurrentStream();
    setError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera or microphone access denied. Please allow permissions in your browser settings and refresh.'
          : err.name === 'NotFoundError'
          ? 'No camera or microphone found. Please connect a device and try again.'
          : `Device error: ${err.message}`
      );
    }
  };

  const enumerateDevices = async () => {
    setLoading(true);
    try {
      // First acquire permissions so labels are populated
      const initStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      initStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      const audioDevices = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));

      setCameras(videoDevices);
      setMics(audioDevices);

      const camId = videoDevices[0]?.deviceId || '';
      const micId = audioDevices[0]?.deviceId || '';
      setSelectedCamera(camId);
      setSelectedMic(micId);
      await startPreview(camId || undefined, micId || undefined);
    } catch (err: any) {
      setError('Failed to access media devices. Please check browser permissions.');
    }
    setLoading(false);
  };

  useEffect(() => {
    enumerateDevices();
    return () => stopCurrentStream();
  }, []);

  const handleCameraChange = async (id: string) => {
    setSelectedCamera(id);
    await startPreview(id || undefined, selectedMic || undefined);
  };

  const handleMicChange = (id: string) => {
    setSelectedMic(id);
  };

  const handleJoin = () => {
    // Transfer stream ownership to parent
    const stream = streamRef.current;
    streamRef.current = null; // prevent cleanup on unmount
    onReady(stream, selectedMic);
  };

  return (
    <div className="hr-modal-overlay">
      <div className="hr-device-modal">
        <div className="hr-modal-header">
          <h2 className="hr-modal-title">Camera &amp; Microphone Setup</h2>
        </div>

        <div className="hr-device-body">
          {/* Video Preview */}
          <div className="hr-video-preview-wrap">
            {loading && (
              <div className="hr-video-loading">
                <RefreshCw size={28} className="hr-spin" />
                <p>Initializing camera…</p>
              </div>
            )}
            {error && !loading && (
              <div className="hr-video-error">
                <AlertTriangle size={24} />
                <p>{error}</p>
                <button className="hr-recheck-btn" onClick={enumerateDevices}>Retry</button>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`hr-video-preview ${loading || error ? 'hr-video-hidden' : ''}`}
            />
            {!loading && !error && (
              <div className="hr-video-badge">
                <span className="hr-badge-dot" /> Live Preview
              </div>
            )}
          </div>

          {/* Device Selection */}
          <div className="hr-device-selectors">
            <div className="hr-device-selector">
              <label className="hr-device-label">
                <Camera size={15} /> Camera
              </label>
              <select
                className="hr-device-select"
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                disabled={cameras.length === 0}
              >
                {cameras.length === 0 && <option>No camera found</option>}
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="hr-device-selector">
              <label className="hr-device-label">
                <Mic size={15} /> Microphone
              </label>
              <select
                className="hr-device-select"
                value={selectedMic}
                onChange={(e) => handleMicChange(e.target.value)}
                disabled={mics.length === 0}
              >
                {mics.length === 0 && <option>No microphone found</option>}
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
                ))}
              </select>
            </div>

            <p className="hr-device-note">
              Make sure your face is clearly visible and you're in a quiet environment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="hr-modal-footer">
          <button className="hr-modal-cancel-btn" onClick={onBack}>← Back</button>
          <button
            id="hr-join-interview-btn"
            className="hr-cta-btn"
            onClick={handleJoin}
            disabled={loading || !!error}
          >
            Join Interview <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
