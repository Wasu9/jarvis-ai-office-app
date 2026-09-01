import React, { useRef, useState } from 'react';
import { ArrowUp, Paperclip, Mic } from 'lucide-react';
import { AttachedFile, JarvisSettings, TaskRecord } from '../types';
import { ApiService } from '../services/api';
import { FileDropzone } from './FileDropzone';
import { VoiceAssistant } from './VoiceAssistant';

interface Props {
  settings: JarvisSettings;
  selectedAgentId: string;
  setActiveTask: (task: TaskRecord | null) => void;
  onTaskCompleted: (task: TaskRecord) => void;
  onAgentHired?: () => void;
}

export const GlobalCommandBar: React.FC<Props> = ({ settings, selectedAgentId, setActiveTask, onTaskCompleted, onAgentHired }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = async (value?: string) => {
    const text = (value ?? prompt).trim();
    if (!text && files.length === 0) return;
    const userPrompt = text || 'Process the attached file.';
    setBusy(true);
    try {
      const task = await ApiService.executeTask({
        userPrompt,
        selectedAgentId,
        attachedFiles: files,
        model: settings.aiModel,
        settings,
      });
      setActiveTask(task);
      onTaskCompleted(task);
      if (task.steps?.some(s => s.label.toLowerCase().includes('hr hired'))) onAgentHired?.();
      setPrompt('');
      setFiles([]);
    } catch (error) {
      console.error('JARVIS command failed', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-6 sm:pb-5 pointer-events-none">
      <div className="mx-auto max-w-5xl pointer-events-auto">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-cyan-300/20 bg-[#071017]/95 p-2 backdrop-blur-xl">
            {files.map(file => <span key={file.id} className="rounded-lg bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">{file.name}</span>)}
          </div>
        )}
        <div className="rounded-2xl border border-cyan-300/30 bg-[#071017]/95 p-2 shadow-[0_10px_60px_rgba(0,0,0,.55),0_0_35px_rgba(34,211,238,.10)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <FileDropzone attachedFiles={files} onAddFiles={next => setFiles(current => [...current, ...next])} onRemoveFile={id => setFiles(current => current.filter(file => file.id !== id))} disabled={busy} />
            <VoiceAssistant onSpeechResult={text => setPrompt(current => current ? `${current} ${text}` : text)} onCommandReady={text => void send(text)} isProcessing={busy} />
            <textarea
              ref={ref}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
              rows={1}
              disabled={busy}
              aria-label="JARVIS command"
              placeholder={busy ? 'JARVIS is working…' : 'Ask JARVIS anything…'}
              className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-3 text-base text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || (!prompt.trim() && files.length === 0)}
              aria-label="Send command"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,.22)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2 px-2 text-[9px] uppercase tracking-[.12em] text-slate-600">
            <span>Enter to send</span><span>•</span><span>Shift + Enter for new line</span><span className="ml-auto text-cyan-300/60">JARVIS CORE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
