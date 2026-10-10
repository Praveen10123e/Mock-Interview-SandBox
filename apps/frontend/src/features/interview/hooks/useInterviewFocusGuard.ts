import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface FocusViolation {
  violationId: string;
  durationMs: number;
  visibilityState: string;
  hasFocus: boolean;
  timestamp: number;
}

interface UseInterviewFocusGuardProps {
  gracePeriodMs?: number;
  onViolation: (violation: FocusViolation) => void;
  enabled?: boolean;
}

export function useInterviewFocusGuard({
  gracePeriodMs = 2000,
  onViolation,
  enabled = true,
}: UseInterviewFocusGuardProps) {
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLossTimeRef = useRef<number | null>(null);
  const currentViolationIdRef = useRef<string | null>(null);
  // Track if we already fired for this specific loss to prevent dupes (e.g., blur + visibilitychange firing together)
  const isPendingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleFocusLoss = () => {
      if (isPendingRef.current) return;
      isPendingRef.current = true;
      focusLossTimeRef.current = Date.now();
      currentViolationIdRef.current = uuidv4();

      timeoutRef.current = setTimeout(() => {
        // Double check if focus is actually lost when timer fires
        if (document.visibilityState === 'hidden' || !document.hasFocus()) {
          const duration = Date.now() - (focusLossTimeRef.current || Date.now());
          
          const violation: FocusViolation = {
            violationId: currentViolationIdRef.current!,
            durationMs: duration,
            visibilityState: document.visibilityState,
            hasFocus: document.hasFocus(),
            timestamp: Date.now(),
          };

          setIsWarningVisible(true);
          onViolation(violation);
        } else {
          // False positive, clear it
          isPendingRef.current = false;
        }
      }, gracePeriodMs);
    };

    const handleFocusGain = () => {
      if (isPendingRef.current) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        isPendingRef.current = false;
        focusLossTimeRef.current = null;
        currentViolationIdRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFocusLoss();
      } else {
        handleFocusGain();
      }
    };

    const onBlur = () => {
      handleFocusLoss();
    };

    const onFocus = () => {
      handleFocusGain();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, gracePeriodMs, onViolation]);

  const acknowledgeWarning = () => {
    setIsWarningVisible(false);
  };

  return {
    isWarningVisible,
    acknowledgeWarning,
  };
}
