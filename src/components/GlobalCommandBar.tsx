import React, { useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
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
      const task = await ApiService.executeTask({ userPrompt, selectedAgentId, attachedFiles: files, model: settings.aiModel, settings });
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
    <div className="fixed inset-x-0 bottom-0 z-[80] px-2 pb-2 sm:px-5 sm:pb-5 pointer-events-none">
      <div className="mx-auto w-full max-w-6xl pointer-events-auto">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 rounded-2xl border border-cyan-300/20 bg-[#071017]/95 p-2.5 backdrop-blur-xl">
            {files.map(file => <span key={file.id} className="rounded-lg bg-cyan-300/10 px-2.5 py-1.5 text-xs text-cyan-100">{file.name}</span>)}
          </div>
        )}
        <div className="rounded-3xl border border-cyan-300/35 bg-[#071017]/98 p-2.5 shadow-[0_12px_70px_rgba(0,0,0,.65),0_0_45px_rgba(34,211,238,.12)] backdrop-blur-2xl">
          <div className="flex items-end gap-2">
            <FileDropzone attachedFiles={files} onAddFiles={next => setFiles(current => [...current, ...next])} onRemoveFile={id => setFiles(current => current.filter(file => file.id !== id))} disabled={busy} />
            <VoiceAssistant onSpeechResult={text => setPrompt(current => current ? `${current} ${text}` : text)} onCommandReady={text => void send(text)} isProcessing={busy} />
            <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0b141d] px-1 transition focus-within:border-cyan-300/50 focus-within:bg-[#0d1822] focus-within:shadow-[0_0_30px_rgba(34,211,238,.08)]">
              <textarea
                ref={ref}
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
                rows={2}
                disabled={busy}
                aria-label="JARVIS command"
                placeholder={busy ? 'JARVIS is working…' : 'Ask JARVIS anything…'}
                className="block min-h-[64px] max-h-40 w-full resize-y bg-transparent px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-500 disabled:cursor-wait"
              />
            </div>
            <button type="button" onClick={() => void send()} disabled={busy || (!prompt.trim() && files.length === 0)} aria-label="Send command" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.24)] transition hover:scale-[1.02] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-30">
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2 px-2 text-[9px] uppercase tracking-[.12em] text-slate-600">
            <span>Enter to send</span><span>•</span><span>Shift + Enter for new line</span><span className="ml-auto text-cyan-300/60">JARVIS CORE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
