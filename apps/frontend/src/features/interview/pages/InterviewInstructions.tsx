import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/card';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';

export const InterviewInstructions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { initializeSession } = useInterviewSessionStore();

  const handleStart = async () => {
    try {
      // In reality, we call the API to start the session.
      // const session = await InterviewService.startInterview(id!);

      // Mocking the successful start and fetching of data
      initializeSession({
        sessionId: 'sess-abc',
        interviewId: id!,
        title: 'Mock Coding Interview',
        state: 'RUNNING',
        remainingTime: 3600,
        questions: [
          {
            id: 'ref-1',
            questionId: 'q-1',
            title: 'Two Sum',
            description:
              'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
            questionType: 'CODING',
            examples: [
              {
                input: 'nums = [2,7,11,15], target = 9',
                output: '[0,1]',
                explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
              },
            ],
            constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
          },
          {
            id: 'ref-2',
            questionId: 'q-2',
            title: 'Reverse Linked List',
            description:
              'Given the head of a singly linked list, reverse the list, and return the reversed list.',
            questionType: 'CODING',
            examples: [{ input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: '' }],
          },
        ],
        currentQuestionIndex: 0,
        answers: {},
        markedForReview: {},
      });

      navigate(`/interview/${id}/session`);
    } catch (err) {
      console.error('Failed to start interview', err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-[80vh] flex flex-col justify-center">
      <Card className="w-full border-warning">
        <CardHeader className="bg-warning/10 border-b border-warning">
          <CardTitle className="text-2xl text-warning-foreground">Important Instructions</CardTitle>
          <p className="text-sm">Please read carefully before starting the session.</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">General Rules</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>The timer will begin immediately upon clicking "Start Interview".</li>
              <li>
                Do not refresh the page or press the back button. Your session state is auto-saved,
                but refreshing may cause temporary sync delays.
              </li>
              <li>
                Switching tabs is strictly monitored in Strict Mode. Violations will be recorded.
              </li>
              <li>
                Ensure your internet connection is stable. The Heartbeat Engine will automatically
                expire your session if you disconnect for more than 5 minutes.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Navigation</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                Use the <strong>Question Palette</strong> to jump between questions freely.
              </li>
              <li>
                You can <strong>Mark for Review</strong> if you want to return to a question later.
              </li>
              <li>Your answers are automatically saved as Drafts every 30 seconds.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-muted/20">
          <button
            onClick={() => navigate('/dashboard/student')}
            className="px-6 py-2 border rounded-md hover:bg-muted font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-8 py-2 bg-primary text-primary-foreground rounded-md font-bold text-lg hover:bg-primary/90 transition-transform active:scale-95"
          >
            START INTERVIEW
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InterviewInstructions;
