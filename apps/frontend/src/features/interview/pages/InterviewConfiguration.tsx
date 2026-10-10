import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/card';

export const InterviewConfiguration: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [language, setLanguage] = useState('JAVASCRIPT');

  const handleNext = () => {
    // In reality, this would call InterviewService to create/schedule the interview
    // For now, we mock moving to instructions
    const mockInterviewId = 'inv-12345';
    navigate(`/interview/${mockInterviewId}/instructions`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex items-center justify-center min-h-[80vh]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Configure {type} Interview</CardTitle>
          <p className="text-muted-foreground">Customize your mock interview parameters.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {(type === 'CODING' || type === 'SQL') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Programming Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {type === 'SQL' ? (
                  <option value="SQL">PostgreSQL</option>
                ) : (
                  <>
                    <option value="JAVASCRIPT">JavaScript (Node.js)</option>
                    <option value="PYTHON">Python 3</option>
                    <option value="JAVA">Java 17</option>
                    <option value="CPP">C++</option>
                  </>
                )}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/50">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="strict"
                className="rounded border-gray-300"
                defaultChecked
              />
              <label htmlFor="strict" className="text-sm font-medium leading-none">
                Strict Mode
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullscreen"
                className="rounded border-gray-300"
                defaultChecked
              />
              <label htmlFor="fullscreen" className="text-sm font-medium leading-none">
                Require Fullscreen
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Continue to Instructions
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InterviewConfiguration;
