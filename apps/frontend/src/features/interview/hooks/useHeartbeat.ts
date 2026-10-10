import { useEffect } from 'react';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';
import { InterviewService } from '../services/interview.service';

export const useHeartbeat = () => {
  const { interviewId, sessionId, state, tickTimer } = useInterviewSessionStore();

  useEffect(() => {
    if (state !== 'RUNNING') return;

    // Send heartbeat API request every 30 seconds
    const interval = setInterval(() => {
      InterviewService.sendHeartbeat(interviewId, sessionId).catch((err) => {
        console.error('Heartbeat failed', err);
      });
    }, 30000);

    // Tick the frontend timer every second
    const timerInterval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [interviewId, sessionId, state, tickTimer]);
};
