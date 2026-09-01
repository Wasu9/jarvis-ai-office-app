import React, { useRef, useState } from 'react';
import { ArrowUp, CheckCircle2, FileText, Mic, Paperclip, RotateCcw, Sparkles, X, Zap } from 'lucide-react';
import { AgentDefinition, AttachedFile, JarvisSettings, TaskRecord } from '../types';
import { FileDropzone } from './FileDropzone';
import { VoiceAssistant } from './VoiceAssistant';
import { ResultViewer } from './ResultViewer';
import { OfficeSimulation3DHyperReal as OfficeSimulation3D } from './OfficeSimulation3DHyperReal';
import { JarvisCore } from './JarvisCore';
import { ApiService } from '../services/api';

interface Props {
  agents: AgentDefinition[];
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  settings: JarvisSettings;
  activeTask: TaskRecord | null;
  setActiveTask: (t: TaskRecord | null) => void;
  onTaskCompleted: (t: TaskRecord) => void;
  onAgentHired?: () => void;
  recentTasks: TaskRecord[];
}

type Msg = { id: string; role: 'user' | 'assistant'; content: string; actions?: string[] };
type ChatHistory = Array<{ role: 'user' | 'assistant'; content: string }>;

const quick = [
  ['📄 PDF → Bilingual', 'Read the attached PDF and create an exact source-faithful bilingual English-Hindi Word document. Do not add, remove, correct, or rewrite anything.'],
  ['🧪 Create DPP', 'Create a NEET DPP with questions, answer key and detailed solutions.'],
  ['📝 New Paper', 'Create a NEET Physics paper with bilingual English-Hindi questions and options.'],
  ['📢 Make Notice', 'Create a professional institute notice for an upcoming mock test.'],
];

const getActions = (text: string) => {
  const t = text.toLowerCase();
  if (/pdf|word|docx|document/.test(t)) return ['Open result', 'Download file', 'Make another'];
  if (/paper|dpp|question|test|exam/.test(t)) return ['Make PDF', 'Make Word', 'Create another'];
  if (/notice|poster|social|instagram|facebook|reel/.test(t)) return ['Make another', 'Change design'];
  return ['Tell me more', 'Do this'];
};

export const OfficeAssistant: React.FC<Props> = p => {
  const { agents, selectedAgentId, settings, activeTask, setActiveTask, onTaskCompleted, onAgentHired, recentTasks } = p;
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Good to see you, Boss. I’m JARVIS. Give me a task — I’ll understand it, choose the right specialist, execute it and verify the result.',
      actions: ['📄 PDF → Bilingual', '🧪 Create DPP', '📝 New Paper'],
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const enabled = agents.filter(a => a.enabled);
  const completed = recentTasks.filter(t => t.status === 'completed').length;
  const working = recentTasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length + (busy ? 1 : 0);

  const reset = () => {
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: 'Core online. Ready for your next command, Boss.', actions: ['📄 PDF → Bilingual', '🧪 Create DPP', '📝 New Paper'] }]);
    setPrompt('');
    setFiles([]);
    setActiveTask(null);
  };

  const execute = async (userText: string, history: ChatHistory) => {
    setBusy(true);
    const pending: TaskRecord = {
      id: `p${Date.now()}`,
      title: userText.slice(0, 90),
      userPrompt: userText,
      agentId: selectedAgentId === 'auto' ? 'jarvis' : selectedAgentId,
      agentName: selectedAgentId === 'auto' ? 'JARVIS' : (enabled.find(a => a.id === selectedAgentId)?.name || 'JARVIS'),
      status: 'understanding',
      createdAt: new Date().toISOString(),
      steps: [{ status: 'understanding', label: 'JARVIS is understanding the request', timestamp: new Date().toISOString() }],
      attachedFiles: [...files],
    };
    setActiveTask(pending);
    try {
      const t = await ApiService.executeTask({ userPrompt: userText, selectedAgentId, attachedFiles: files, model: settings.aiModel, settings, history });
      setActiveTask(t);
      if (t.agentId === 'conversational-core') {
        setMessages(m => [...m, { id: `a${Date.now()}`, role: 'assistant', content: t.result?.rawText || 'Done, Boss.', actions: getActions(t.result?.rawText || '') }]);
        setActiveTask(null);
      } else {
        if (t.steps?.some(s => s.label.toLowerCase().includes('hr hired'))) onAgentHired?.();
        onTaskCompleted(t);
        if (t.result?.rawText) setMessages(m => [...m, { id: `a${Date.now()}`, role: 'assistant', content: t.result.rawText, actions: getActions(t.result.rawText) }]);
      }
    } catch (e: any) {
      const message = e?.message || 'Something went wrong.';
      setMessages(m => [...m, { id: `e${Date.now()}`, role: 'assistant', content: `I hit a problem: ${message}`, actions: ['Retry'] }]);
      setActiveTask({ ...pending, status: 'failed', error: message, completedAt: new Date().toISOString() });
    } finally {
      setBusy(false);
      setFiles([]);
    }
  };

  const send = (custom?: string) => {
    const text = (custom ?? prompt).trim();
    if (!text && !files.length) return;
    const userText = text || 'Process the attached file.';
    const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
    setMessages(m => [...m, { id: `u${Date.now()}`, role: 'user', content: userText }]);
    setPrompt('');
    void execute(userText, history);
  };

  const action = (a: string) => {
    if (a === 'Retry' && activeTask) { void execute(activeTask.userPrompt, messages.slice(-12).map(m => ({ role: m.role, content: m.content }))); return; }
    if (a === 'Open result' || a === 'Download file' || a === 'Make PDF' || a === 'Make Word') return;
    if (a === 'Make another' || a === 'Create another') { setPrompt('Create another one like the last result.'); ref.current?.focus(); return; }
    if (a === 'Tell me more') { setPrompt('Explain this in more detail.'); ref.current?.focus(); return; }
    if (a === 'Change design') { setPrompt('Make a better professional design.'); ref.current?.focus(); return; }
    if (a === 'Do this') { setPrompt('Do it.'); ref.current?.focus(); return; }
    const q = quick.find(([label]) => label === a);
    if (q) { send(q[1]); return; }
    setPrompt(a); ref.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-[1560px] text-slate-200">
      <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#071017] p-4 shadow-[0_0_50px_rgba(34,211,238,.06)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.09),transparent_32%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black tracking-[.18em] text-white"><Sparkles className="h-4 w-4 text-cyan-300" /> JARVIS COMMAND CENTER</div>
              <div className="mt-1 text-[9px] uppercase tracking-[.16em] text-slate-500">Understand · Delegate · Execute · Verify · Deliver</div>
            </div>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-emerald-300">● CORE ONLINE</span>
              <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-slate-400">{enabled.length} AGENTS</span>
              <button onClick={reset} className="rounded-lg border border-white/10 bg-white/[.03] p-2 text-slate-400 hover:text-white" title="New chat"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5"><div className="text-[8px] text-slate-600">MISSIONS</div><div className="mt-1 font-mono text-sm text-slate-200">{recentTasks.length}</div></div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5"><div className="text-[8px] text-slate-600">COMPLETED</div><div className="mt-1 flex items-center gap-1.5 font-mono text-sm text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{completed}</div></div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5"><div className="text-[8px] text-slate-600">LIVE</div><div className="mt-1 font-mono text-sm text-cyan-300">{working ? `${working} ACTIVE` : 'READY'}</div></div>
          </div>
        </section>
        <JarvisCore activeTask={activeTask} employeeCount={enabled.length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="order-2 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-[#080f15] shadow-xl lg:order-1">
          <div className="flex h-[min(68vh,700px)] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {messages.map(m => <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.role === 'user' ? 'max-w-[86%] rounded-2xl rounded-br-md bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,.12)]' : 'max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-[#101b24] px-4 py-3 text-sm text-slate-200'}>
                  <div className="whitespace-pre-wrap leading-6">{m.content}</div>
                  {m.role === 'assistant' && m.actions && <div className="mt-3 flex flex-wrap gap-1.5">{m.actions.map(a => <button key={a} onClick={() => action(a)} className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-[9px] font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10">{a}</button>)}</div>}
                </div>
              </div>)}
              {busy && <div className="flex items-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[.03] px-3 py-2 text-[10px] text-cyan-200"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" /> JARVIS is working through the task…</div>}
            </div>

            <div className="border-t border-white/10 bg-[#070d13] p-3 sm:p-4">
              {files.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{files.map(f => <span key={f.id} className="inline-flex items-center rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-2.5 py-1.5 text-[9px] text-cyan-200">{f.name}<button onClick={() => setFiles(x => x.filter(y => y.id !== f.id))}><X className="ml-1.5 h-3 w-3" /></button></span>)}</div>}
              <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-[#0a1118] p-2 transition focus-within:border-cyan-300/40 focus-within:shadow-[0_0_25px_rgba(34,211,238,.05)]">
                <FileDropzone attachedFiles={files} onAddFiles={x => setFiles(v => [...v, ...x])} onRemoveFile={id => setFiles(v => v.filter(x => x.id !== id))} disabled={busy} />
                <VoiceAssistant onSpeechResult={t => setPrompt(x => x ? `${x} ${t}` : t)} onCommandReady={t => send(t)} isProcessing={busy} />
                <textarea ref={ref} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Tell JARVIS what you want done…" className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-white outline-none placeholder:text-slate-600" disabled={busy} />
                <button onClick={() => send()} disabled={busy || (!prompt.trim() && !files.length)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,.18)] transition hover:bg-cyan-200 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">{quick.map(([label, text]) => <button key={label} onClick={() => send(text)} className="rounded-full border border-slate-700 bg-white/[.02] px-2.5 py-1.5 text-[9px] text-slate-400 transition hover:border-cyan-300/25 hover:text-cyan-200">{label}</button>)}</div>
            </div>
          </div>
        </section>

        <aside className="order-1 min-w-0 space-y-3 lg:order-2">
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#080f15]">
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5"><div className="flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-slate-300"><Zap className="h-3.5 w-3.5 text-cyan-300" /> AI WORKSPACE</div><span className="text-[8px] text-slate-600">LIVE</span></div>
            <div className="h-[250px] sm:h-[290px]"><OfficeSimulation3D agents={enabled} activeTask={activeTask} /></div>
          </div>
          {activeTask?.status === 'completed' && activeTask.result && <div className="rounded-2xl border border-slate-700 bg-[#0c141b] p-3"><ResultViewer task={activeTask} onRepeat={() => setPrompt(activeTask.userPrompt)} /></div>}
          <div className="rounded-2xl border border-slate-700 bg-[#0b131a] p-3">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-slate-300"><Paperclip className="h-3.5 w-3.5 text-cyan-300" /> WORKFLOW</div>
            <div className="grid grid-cols-2 gap-1.5 text-[8px] text-slate-500"><div className="rounded-lg bg-white/[.02] p-2">UNDERSTAND</div><div className="rounded-lg bg-white/[.02] p-2">DELEGATE</div><div className="rounded-lg bg-white/[.02] p-2">EXECUTE</div><div className="rounded-lg bg-white/[.02] p-2">VERIFY</div></div>
            <div className="mt-2 text-[8px] leading-4 text-slate-600">JARVIS keeps source documents authoritative. Creative generation is used only when explicitly requested.</div>
          </div>
        </aside>
      </div>
    </div>
  );
};
