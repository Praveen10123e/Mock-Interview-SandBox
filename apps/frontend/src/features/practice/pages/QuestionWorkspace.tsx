import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Copy, Check, ChevronLeft, LayoutTemplate, Settings, Type, WrapText } from 'lucide-react';
import { getDisplayName } from '../../../utils/display';
import { extractErrorMessage } from '../../../utils/display';
import { formatExampleText } from '../../../utils/formatExampleText';
import { useQuestionById } from '../../../api/questions';
import { useExecuteCode } from '../../../api/judge';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { CodeEditor } from '../components/CodeEditor';
import { ExecutionConsole } from '../components/ExecutionConsole';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

export const QuestionWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: question, isLoading } = useQuestionById(id);
  const executeCodeMutation = useExecuteCode();
  
  const [isCopied, setIsCopied] = useState(false);

  const { 
    code, setCode, languageId, setLanguageId, setLanguageName, setTheme, theme, setFontSize, fontSize, wordWrap, setWordWrap, setIsRunning, setOutput, setError, setExecutionMetrics, resetWorkspace, customInput, setJudgeResponse, setLastRunMode, setActiveConsoleTab
  } = useWorkspaceStore();

  useEffect(() => {
    // Reset workspace when loading a new question
    resetWorkspace();
    
    // Set some default stub if needed
    if (question && !code) {
      if (question.language?.name?.toLowerCase() === 'python' || question.questionType === 'CODING') {
        setLanguageId(71); // Python
        setLanguageName('python');
        setCode('# Write your code here\n');
      } else if (question.questionType === 'SQL') {
        setLanguageId(82); // PostgreSQL
        setLanguageName('sql');
        setCode('-- Write your SQL query here\n');
      }
    }
  }, [question, id]);

  const handleRun = async () => {
    if (!code.trim()) return;
    
    const isCustomRun = customInput && customInput.trim().length > 0;
    const effectiveRunMode = isCustomRun ? 'CUSTOM' : 'RUN';

    setIsRunning(true);
    setActiveConsoleTab('results');
    setLastRunMode(effectiveRunMode as any);
    setOutput(null);
    setError(null);
    setExecutionMetrics(null);
    setJudgeResponse(null);

    try {
      const res = await executeCodeMutation.mutateAsync({
        executionMode: 'PRACTICE',
        runMode: effectiveRunMode as any,
        sourceCode: code,
        languageId,
        customInput: isCustomRun ? customInput : undefined,
        questionRefId: question?.id,
      });

      // Defensive unwrap: normalize flat vs enveloped responses
      const data: any = (res as any)?.data !== undefined && (res as any)?.status === undefined && (res as any)?.results === undefined
        ? (res as any).data
        : res;

      setJudgeResponse(data);

      if (data.success === false) {
        const errorType: string = data.errorType || '';
        if (errorType === 'COMPILATION_ERROR') {
          setError(`COMPILATION_ERROR\n\n${data.message || 'Compilation failed'}`);
        } else if (errorType === 'RUNTIME_ERROR') {
          setError(`RUNTIME_ERROR\n\n${data.message || 'Runtime error'}`);
        } else if (errorType === 'WRAPPER_ERROR') {
          setError(`WRAPPER_ERROR\n\n${data.message || 'Function resolution error'}`);
        } else if (errorType === 'COMPILER_SERVICE_UNAVAILABLE') {
          setError(`COMPILER_SERVICE_UNAVAILABLE\n\n${data.message || 'Execution service unavailable'}`);
        } else {
          setError(data.message || 'Execution failed');
        }
      } else if (data.results) {
        setOutput(data.stdout || null);
      } else if (data.status?.id === 3) {
        setOutput(data.stdout || null);
      } else if (data.compileOutput) {
        setError(`COMPILATION_ERROR\n\n${data.compileOutput}`);
      } else if (data.stderr) {
        setError(`RUNTIME_ERROR\n\n${data.stderr}`);
      } else {
        setOutput(data.stdout || null);
      }
      
      setExecutionMetrics({ time: data.time ?? null, memory: data.memory ?? null });
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Execution failed due to Network/Server error'));
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] p-6 flex gap-6">
        <Skeleton className="w-1/2 h-full rounded-2xl" />
        <Skeleton className="w-1/2 h-full rounded-2xl" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Question Not Found</h2>
        <Button onClick={() => navigate('/student/practice/questions')}>Back to Question Bank</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] p-4 max-w-[1600px] mx-auto flex flex-col md:flex-row gap-4">
      {/* Left Panel: Problem Statement */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[45%] flex flex-col bg-card rounded-2xl border border-white/5 overflow-hidden shadow-lg"
      >
        <div className="p-4 border-b border-white/5 bg-muted/30 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/practice/questions')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-lg line-clamp-1">{question.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border 
                ${question.difficulty === 'EASY' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  question.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                  'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {question.difficulty}
              </span>
              {question.category && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <LayoutTemplate className="h-3 w-3" /> {getDisplayName(question.category)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none">
          <div className="text-sm leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: question.description?.replace(/\n/g, '<br/>') || '' }} />
          
          {question.metadata?.examples && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-foreground">Examples</h3>
              {question.metadata.examples.map((ex: any, i: number) => {
                const formattedInput = formatExampleText(ex.input);
                const formattedOutput = formatExampleText(ex.output);
                return (
                  <div key={i} className="bg-muted/30 p-4 rounded-xl border border-white/5 font-mono text-sm space-y-3">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold block">Input:</span>
                      <pre className="p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto m-0">
                        {formattedInput}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold block">Output:</span>
                      <pre className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 font-mono text-xs text-emerald-400 font-semibold whitespace-pre-wrap leading-relaxed overflow-x-auto m-0">
                        {formattedOutput}
                      </pre>
                    </div>
                    {ex.explanation && (
                      <div className="text-xs pt-1 border-t border-white/10">
                        <span className="text-muted-foreground font-semibold">Explanation: </span>
                        <span className="whitespace-pre-wrap">{formatExampleText(ex.explanation)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {question.metadata?.constraints && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">Constraints</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                {question.metadata.constraints.map((c: string, i: number) => (
                  <li key={i}><code>{c}</code></li>
                ))}
              </ul>
            </div>
          )}

          {question.metadata && Object.keys(question.metadata).length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Metadata Attributes</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(question.metadata)
                  .filter(([k]) => !['examples', 'constraints'].includes(k))
                  .map(([k, v]) => (
                  <div key={k} className="bg-muted/30 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-muted-foreground mb-1">{k}</div>
                    <div className="text-sm font-medium">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Right Panel: Editor & Console */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[55%] flex flex-col gap-4"
      >
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-white/5 shadow-lg relative">
          <div className="h-12 bg-[#1e1e1e] flex items-center justify-between px-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <select 
                className="bg-transparent text-sm text-gray-300 outline-none cursor-pointer hover:text-white transition-colors"
                value={languageId}
                onChange={(e) => {
                  setLanguageId(Number(e.target.value));
                  setLanguageName(e.target.options[e.target.selectedIndex].text.toLowerCase());
                }}
                aria-label="Select Language"
              >
                <option value={71}>Python</option>
                <option value={82}>SQL</option>
                <option value={93}>JavaScript</option>
                <option value={50}>C</option>
                <option value={54}>C++</option>
                <option value={62}>Java</option>
              </select>
              
              <div className="h-4 w-[1px] bg-white/10" />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                title="Toggle Theme"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => setFontSize(fontSize === 14 ? 16 : 14)}
                title="Toggle Font Size"
              >
                <Type className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${wordWrap === 'on' ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
                title="Toggle Word Wrap"
              >
                <WrapText className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => {
                  setCode('');
                }}
                title="Reset Code"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title="Copy Code"
              >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <Button 
              size="sm" 
              className="h-8 gap-1.5 shadow-none"
              onClick={handleRun}
              disabled={executeCodeMutation.isPending}
            >
              <Play className="h-3.5 w-3.5" />
              Run Code
            </Button>
          </div>
          <CodeEditor />
          <ExecutionConsole />
        </div>
      </motion.div>
    </div>
  );
};
