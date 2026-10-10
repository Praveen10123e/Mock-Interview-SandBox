import { useEffect, useRef } from 'react';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';
import { InterviewService } from '../services/interview.service';

export const useAutoSave = () => {
  const { interviewId, answers, state } = useInterviewSessionStore();
  const lastSavedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (state !== 'RUNNING') return;

    const autoSaveInterval = setInterval(async () => {
      for (const questionRefId in answers) {
        const answer = answers[questionRefId];
        const lastSaved = lastSavedRef.current[questionRefId];

        if (answer.value !== lastSaved && answer.isDraft) {
          try {
            await InterviewService.saveAnswer(interviewId, questionRefId, answer.value);
            lastSavedRef.current[questionRefId] = answer.value;
            // Optionally update store to mark isDraft = false, but omitted for simplicity
          } catch (err) {
            console.error('AutoSave failed for question', questionRefId, err);
          }
        }
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [interviewId, answers, state]);
};
