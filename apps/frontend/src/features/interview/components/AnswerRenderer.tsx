import React from 'react';
import Editor from '@monaco-editor/react';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';

export const AnswerRenderer: React.FC = () => {
  const currentQuestion = useInterviewSessionStore((state) => state.getCurrentQuestion());
  const currentAnswer = useInterviewSessionStore((state) => state.getCurrentAnswer());
  const setAnswer = useInterviewSessionStore((state) => state.setAnswer);
  const selectedLanguageId = useInterviewSessionStore((state) => state.selectedLanguageId);
  const setSelectedLanguageId = useInterviewSessionStore((state) => state.setSelectedLanguageId);
  const executionLoading = useInterviewSessionStore((state) => state.executionLoading);
  const executionResult = useInterviewSessionStore((state) => state.executionResult);
  const setExecutionLoading = useInterviewSessionStore((state) => state.setExecutionLoading);
  const setExecutionResult = useInterviewSessionStore((state) => state.setExecutionResult);
  const interviewId = useInterviewSessionStore((state) => state.interviewId);

  if (!currentQuestion) return null;

  const handleEditorChange = (value: string | undefined) => {
    setAnswer(currentQuestion.id, value || '', true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswer(currentQuestion.id, e.target.value, true);
  };

  const { questionType } = currentQuestion;

  if (questionType === 'CODING' || questionType === 'SQL') {
    return (
      <div className="h-full w-full flex flex-col border border-border rounded-md overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="bg-muted p-2 flex justify-between items-center border-b border-border">
          <div className="flex space-x-2 items-center">
            <span className="text-sm font-medium">
              {questionType === 'CODING' ? 'Code Editor' : 'SQL Editor'}
            </span>
            <select
              className="text-xs bg-background border border-border rounded px-2 py-1"
              value={selectedLanguageId}
              onChange={(e) => setSelectedLanguageId(Number(e.target.value))}
            >
              <option value={71}>Python 3</option>
              <option value={62}>Java</option>
              <option value={63}>JavaScript</option>
              <option value={54}>C++</option>
              <option value={82}>SQL</option>
            </select>
          </div>
          <button
            className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 flex items-center"
            disabled={executionLoading}
            onClick={async () => {
              setExecutionLoading(true);
              setExecutionResult(null);
              try {
                const { InterviewService } = await import('../services/interview.service');
                const result = await InterviewService.executeCode(interviewId, {
                  questionRefId: currentQuestion.id,
                  studentId: 'student-id', // Mocked or derived from Auth
                  languageId: selectedLanguageId,
                  sourceCode: currentAnswer?.value || '',
                });
                setExecutionResult(result.data);
              } catch (err: any) {
                setExecutionResult({ status: 'Error', message: err.message });
              } finally {
                setExecutionLoading(false);
              }
            }}
          >
            {executionLoading ? 'Running...' : '▶ Run Code'}
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={selectedLanguageId === 82 ? 'sql' : 'python'}
            theme="vs-dark"
            value={currentAnswer?.value || ''}
            onChange={handleEditorChange}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>

        {/* Output Console */}
        <div className="h-48 bg-black text-green-400 p-2 font-mono text-xs overflow-y-auto border-t border-border">
          <div className="mb-2 text-muted-foreground border-b border-gray-800 pb-1">
            Console Output
          </div>
          {executionLoading && <div>Executing securely in Judge0 Sandbox...</div>}
          {executionResult && (
            <div>
              <div className="text-yellow-400 mb-1">Status: {executionResult.status}</div>
              {executionResult.stdout && (
                <div>
                  <span className="text-white">stdout:</span>
                  <br />
                  {executionResult.stdout}
                </div>
              )}
              {executionResult.stderr && (
                <div className="text-red-400">
                  <span className="text-white">stderr:</span>
                  <br />
                  {executionResult.stderr}
                </div>
              )}
              {executionResult.compileOutput && (
                <div className="text-orange-400">
                  <span className="text-white">compile:</span>
                  <br />
                  {executionResult.compileOutput}
                </div>
              )}
              {executionResult.time && (
                <div className="mt-2 text-gray-500">
                  Time: {executionResult.time}s | Mem: {executionResult.memory}KB
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for TEXT, HR, BEHAVIORAL, SCENARIO
  return (
    <div className="h-full w-full flex flex-col border border-border rounded-md overflow-hidden bg-background">
      <div className="bg-muted p-2 text-sm font-medium border-b border-border">Response</div>
      <textarea
        className="flex-1 w-full p-4 resize-none focus:outline-none bg-background text-foreground"
        placeholder="Type your answer here..."
        value={currentAnswer?.value || ''}
        onChange={handleTextChange}
      />
    </div>
  );
};
