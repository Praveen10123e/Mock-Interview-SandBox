
import Editor from '@monaco-editor/react';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { Loader2 } from 'lucide-react';

export const CodeEditor = () => {
  const { code, setCode, languageName, theme, fontSize, wordWrap } = useWorkspaceStore();

  const getMonacoLang = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n === 'c') return 'c';
    if (n === 'cpp' || n === 'c++') return 'cpp';
    if (n === 'js' || n === 'javascript') return 'javascript';
    if (n === 'py' || n === 'python') return 'python';
    if (n === 'java') return 'java';
    if (n === 'sql') return 'sql';
    return n || 'python';
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-background rounded-b-xl border-t border-white/10">
      <Editor
        height="100%"
        language={getMonacoLang(languageName)}
        theme={theme}
        value={code}
        onChange={(value) => setCode(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: fontSize,
          wordWrap: wordWrap,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
        loading={
          <div className="flex items-center justify-center h-full w-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      />
    </div>
  );
};
