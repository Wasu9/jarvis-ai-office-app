import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Brain, Cpu, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Layers, Terminal, Zap, Radio, Activity, ShieldCheck } from 'lucide-react';
import { TaskRecord, TaskStatus, TaskStep } from '../types';

interface TaskPipelineStepperProps { task: TaskRecord; onRetry?: () => void; }

const phases = [
  { key: 'waiting', label: 'QUEUE', icon: <Clock className="h-4 w-4" /> },
  { key: 'understanding', label: 'ROUTING', icon: <Brain className="h-4 w-4" /> },
  { key: 'working', label: 'MEMORY', icon: <Layers className="h-4 w-4" /> },
  { key: 'generating', label: 'GENERATING', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'checking', label: 'VERIFYING', icon: <Cpu className="h-4 w-4" /> },
  { key: 'completed', label: 'READY', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const statusIndex = (s: TaskStatus) => ({ waiting: 0, understanding: 1, working: 2, generating: 3, checking: 4, completed: 5, failed: -1 } as Record<string, number>)[s] ?? 0;

export const TaskPipelineStepper: React.FC<TaskPipelineStepperProps> = ({ task, onRetry }) => {
  const [pulse, setPulse] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [liveSteps, setLiveSteps] = useState<TaskStep[]>(task.steps || []);
  const [liveStatus, setLiveStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setLiveSteps(task.steps || []);
    setLiveStatus(task.status);
  }, [task.id, task.status, task.steps]);

  useEffect(() => {
    const handler = (event: Event) => {
      const step = (event as CustomEvent<TaskStep>).detail;
      if (!step) return;
      setLiveSteps(prev => [...prev.filter(s => s.timestamp !== step.timestamp), step]);
      setLiveStatus(step.status);
    };
    window.addEventListener('jarvis-task-step', handler);
    return () => window.removeEventListener('jarvis-task-step', handler);
  }, []);

  const failed = liveStatus === 'failed';
  const live = !failed && liveStatus !== 'completed';
  const realIndex = statusIndex(liveStatus);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      setPulse(v => (v + 1) % 6);
      setElapsed(Math.max(0, Date.now() - new Date(task.createdAt).getTime()));
    }, 500);
    setElapsed(Math.max(0, Date.now() - new Date(task.createdAt).getTime()));
    return () => window.clearInterval(timer);
  }, [live, task.createdAt]);

  const progress = failed ? 0 : liveStatus === 'completed' ? 100 : Math.round(((realIndex + 1) / phases.length) * 100);
  const elapsedLabel = `${Math.floor(elapsed / 60000).toString().padStart(2, '0')}:${Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0')}`;
  const terminalLines = useMemo(() => liveSteps, [liveSteps]);
  const latestStep = terminalLines[terminalLines.length - 1];

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#030911] shadow-[0_0_55px_rgba(0,210,255,0.10)]">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.07) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/10 to-transparent" />

      <div className="relative border-b border-cyan-400/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.25)]">
              <Activity className="h-5 w-5" />
              {live && <span className="absolute inset-[-5px] rounded-full border border-cyan-300/20 animate-ping" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.24em] text-cyan-200"><Radio className="h-3.5 w-3.5" /> JARVIS // LIVE EXECUTION</div>
              <div className="mt-1 text-xs text-slate-500">Agent <span className="text-slate-200">{task.agentName}</span> · task {task.id.slice(-8)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className={`rounded-full border px-2 py-1 ${live ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : failed ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'}`}>{live ? 'SERVER ACTIVE' : failed ? 'FAILED' : 'COMPLETE'}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-slate-400">T+ {elapsedLabel}</span>
          </div>
        </div>
      </div>

      <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1.65fr_1fr]">
        <div className="relative min-h-[210px] overflow-hidden rounded-2xl border border-cyan-400/10 bg-black/30 p-4">
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/50 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,.35)]" />
          <div className="absolute left-1/2 top-1/2 h-[150px] w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-300/10" />
          <div className="absolute left-1/2 top-1/2 h-px w-[150px] -translate-x-1/2 -translate-y-1/2 bg-cyan-300/10" />
          {live && <div className="absolute left-1/2 top-1/2 h-[145px] w-1/2 origin-left -translate-y-1/2 border-t border-cyan-200/40 animate-[spin_3s_linear_infinite]" />}
          <div className="absolute left-3 top-3 text-[9px] font-black tracking-[0.2em] text-slate-600">CORE TELEMETRY</div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[9px] text-slate-500"><span>STAGE {Math.max(1, realIndex + 1)}/{phases.length}</span><span>{progress}%</span></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-black/50">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5"><div className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-cyan-200"><Terminal className="h-3.5 w-3.5" /> ACTUAL TASK EVENT STREAM</div><span className="text-[9px] font-mono text-slate-600">{terminalLines.length} EVENTS</span></div>
          <div className="max-h-[210px] min-h-[210px] overflow-auto p-3 font-mono text-[10px] leading-5">
            {terminalLines.length === 0 ? <div className="text-slate-600">Waiting for server event…</div> : terminalLines.map((step, i) => <div key={`${step.timestamp}-${i}`} className={`flex gap-2 ${i === terminalLines.length - 1 ? 'text-cyan-100' : 'text-slate-500'}`}><span className="shrink-0 text-cyan-500/50">{new Date(step.timestamp).toLocaleTimeString()}</span><span className="text-cyan-500/50">›</span><span>{step.label}{step.details ? <span className="ml-2 text-slate-700">{step.details}</span> : null}</span></div>)}
            {live && <div className="mt-1 text-cyan-400/70"><span className="animate-pulse">▌</span> awaiting next server event</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-black/30 p-4">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> SYSTEM SIGNAL</div>
          <div className="space-y-3 font-mono text-[10px]">
            {phases.map((p, i) => { const done = !failed && (realIndex > i || liveStatus === 'completed'); const current = live && i === realIndex; return <div key={p.key} className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : current ? 'bg-cyan-300 animate-pulse' : 'bg-slate-700'}`} /><span className={current ? 'text-cyan-200' : done ? 'text-slate-400' : 'text-slate-700'}>{p.label}</span><span className="ml-auto text-[8px]">{done ? 'DONE' : current ? 'ACTIVE' : 'WAIT'}</span></div>; })}
          </div>
          <div className="mt-5 border-t border-white/5 pt-4"><div className="mb-2 flex justify-between text-[9px] font-mono text-slate-500"><span>SERVER PIPELINE</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.8)] transition-all duration-300" style={{ width: `${progress}%` }} />{live && <div className="relative -top-1 h-1.5 w-16 bg-white/70 blur-sm animate-[scan_1.2s_linear_infinite]" />}</div></div>
          {latestStep && <div className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-3 text-[9px] text-slate-500"><div className="mb-1 text-cyan-300">CURRENT EVENT</div>{latestStep.label}</div>}
        </div>
      </div>

      {failed && <div className="relative mx-4 mb-4 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 sm:mx-5"><AlertCircle className="mt-0.5 h-4 w-4 text-rose-400" /><div className="flex-1"><b className="text-rose-300">Task Failed:</b> {task.error || 'Execution encountered an unexpected issue.'}</div>{onRetry && <button onClick={onRetry} className="rounded-lg border border-rose-400/40 px-2 py-1 text-[10px] text-rose-200"><RefreshCw className="mr-1 inline h-3 w-3" />Retry</button>}</div>}
    </div>
  );
};
