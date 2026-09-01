import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Brain, Cpu, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Layers, Terminal, Radio, Activity, ShieldCheck, PauseCircle } from 'lucide-react';
import { TaskRecord, TaskStatus, TaskStep } from '../types';

interface TaskPipelineStepperProps { task: TaskRecord; onRetry?: () => void; }

const phases = [
  { key: 'waiting', label: 'QUEUE' },
  { key: 'understanding', label: 'ROUTING' },
  { key: 'working', label: 'MEMORY' },
  { key: 'generating', label: 'GENERATING' },
  { key: 'checking', label: 'VERIFYING' },
  { key: 'completed', label: 'READY' },
];

const statusIndex = (s: TaskStatus) => ({ waiting: 0, understanding: 1, working: 2, generating: 3, checking: 4, completed: 5, failed: -1 } as Record<string, number>)[s] ?? 0;

export const TaskPipelineStepper: React.FC<TaskPipelineStepperProps> = ({ task, onRetry }) => {
  const [elapsed, setElapsed] = useState(0);
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const [liveSteps, setLiveSteps] = useState<TaskStep[]>(task.steps || []);
  const [liveStatus, setLiveStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setLiveSteps(task.steps || []);
    setLiveStatus(task.status);
    const last = task.steps?.[task.steps.length - 1]?.timestamp;
    setLastEventAt(last ? new Date(last).getTime() : Date.now());
  }, [task.id, task.status, task.steps]);

  useEffect(() => {
    const handler = (event: Event) => {
      const step = (event as CustomEvent<TaskStep>).detail;
      if (!step) return;
      setLiveSteps(prev => [...prev.filter(s => s.timestamp !== step.timestamp), step]);
      setLiveStatus(step.status);
      setLastEventAt(new Date(step.timestamp).getTime());
    };
    window.addEventListener('jarvis-task-step', handler);
    return () => window.removeEventListener('jarvis-task-step', handler);
  }, []);

  const failed = liveStatus === 'failed';
  const complete = liveStatus === 'completed';
  const live = !failed && !complete;
  const realIndex = statusIndex(liveStatus);
  const terminalLines = useMemo(() => liveSteps, [liveSteps]);
  const latestStep = terminalLines[terminalLines.length - 1];
  const progress = failed ? 0 : complete ? 100 : Math.round(((realIndex + 1) / phases.length) * 100);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Date.now() - new Date(task.createdAt).getTime()));
    }, 500);
    setElapsed(Math.max(0, Date.now() - new Date(task.createdAt).getTime()));
    return () => window.clearInterval(timer);
  }, [live, task.createdAt]);

  const silenceSeconds = live ? Math.max(0, Math.floor((Date.now() - lastEventAt) / 1000)) : 0;
  const signalState = failed ? 'FAILED' : complete ? 'COMPLETE' : silenceSeconds >= 15 ? 'HOLD / NO SIGNAL' : liveStatus === 'waiting' ? 'QUEUED' : 'WORKING';
  const signalText = failed ? 'Execution stopped with an error.' : complete ? 'Task finished successfully.' : silenceSeconds >= 15 ? `No new server event for ${silenceSeconds}s. JARVIS may be waiting on the next operation.` : latestStep ? `Last activity: ${latestStep.label}` : 'JARVIS has started the task.';
  const statusClass = failed ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : complete ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : silenceSeconds >= 15 ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  const elapsedLabel = `${Math.floor(elapsed / 60000).toString().padStart(2, '0')}:${Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#030911] shadow-[0_0_55px_rgba(0,210,255,0.10)]">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.07) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/10 to-transparent" />

      <div className="relative border-b border-cyan-400/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.25)]">
              {silenceSeconds >= 15 && live ? <PauseCircle className="h-5 w-5 text-amber-300" /> : failed ? <AlertCircle className="h-5 w-5 text-rose-300" /> : complete ? <CheckCircle2 className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
              {live && silenceSeconds < 15 && <span className="absolute inset-[-5px] rounded-full border border-cyan-300/20 animate-ping" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.24em] text-cyan-200"><Radio className="h-3.5 w-3.5" /> JARVIS // TASK WORKSPACE</div>
              <div className="mt-1 text-xs text-slate-500">Agent <span className="text-slate-200">{task.agentName}</span> · task {task.id.slice(-8)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className={`rounded-full border px-2 py-1 ${statusClass}`}>{signalState}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-slate-400">T+ {elapsedLabel}</span>
          </div>
        </div>
      </div>

      <div className={`relative mx-4 mt-4 rounded-2xl border px-4 py-3 sm:mx-5 ${statusClass}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1"><div className="text-[11px] font-black tracking-[0.18em]">{signalState}</div><div className="mt-1 text-xs opacity-80">{signalText}</div></div>
          <div className="hidden shrink-0 text-right font-mono text-[9px] sm:block"><div>STAGE {Math.max(1, realIndex + 1)}/{phases.length}</div><div className="mt-1">{progress}%</div></div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20"><div className="h-full bg-current opacity-80 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1.65fr_1fr]">
        <div className="relative min-h-[210px] overflow-hidden rounded-2xl border border-cyan-400/10 bg-black/30 p-4">
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/50 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,.35)]" />
          <div className="absolute left-1/2 top-1/2 h-[150px] w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-300/10" />
          <div className="absolute left-1/2 top-1/2 h-px w-[150px] -translate-x-1/2 -translate-y-1/2 bg-cyan-300/10" />
          {live && silenceSeconds < 15 && <div className="absolute left-1/2 top-1/2 h-[145px] w-1/2 origin-left -translate-y-1/2 border-t border-cyan-200/40 animate-[spin_3s_linear_infinite]" />}
          <div className="absolute left-3 top-3 text-[9px] font-black tracking-[0.2em] text-slate-600">CORE TELEMETRY</div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[9px] text-slate-500"><span>STAGE {Math.max(1, realIndex + 1)}/{phases.length}</span><span>{progress}%</span></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-black/50">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5"><div className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-cyan-200"><Terminal className="h-3.5 w-3.5" /> ACTUAL TASK EVENT STREAM</div><span className="text-[9px] font-mono text-slate-600">{terminalLines.length} EVENTS</span></div>
          <div className="max-h-[210px] min-h-[210px] overflow-auto p-3 font-mono text-[10px] leading-5">
            {terminalLines.length === 0 ? <div className="text-slate-600">Waiting for server event…</div> : terminalLines.map((step, i) => <div key={`${step.timestamp}-${i}`} className={`flex gap-2 ${i === terminalLines.length - 1 ? 'text-cyan-100' : 'text-slate-500'}`}><span className="shrink-0 text-cyan-500/50">{new Date(step.timestamp).toLocaleTimeString()}</span><span className="text-cyan-500/50">›</span><span>{step.label}{step.details ? <span className="ml-2 text-slate-700">{step.details}</span> : null}</span></div>)}
            {live && <div className="mt-1 text-cyan-400/70"><span className="animate-pulse">▌</span> {silenceSeconds >= 15 ? 'NO NEW SIGNAL — CHECKING SERVER…' : 'awaiting next server event'}</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-black/30 p-4">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> TASK STATUS</div>
          <div className="space-y-3 font-mono text-[10px]">
            {phases.map((p, i) => { const done = !failed && (realIndex > i || complete); const current = live && i === realIndex; return <div key={p.key} className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : current ? silenceSeconds >= 15 ? 'bg-amber-300' : 'bg-cyan-300 animate-pulse' : 'bg-slate-700'}`} /><span className={current ? silenceSeconds >= 15 ? 'text-amber-200' : 'text-cyan-200' : done ? 'text-slate-400' : 'text-slate-700'}>{p.label}</span><span className="ml-auto text-[8px]">{done ? 'DONE' : current ? silenceSeconds >= 15 ? 'HOLD?' : 'ACTIVE' : 'WAIT'}</span></div>; })}
          </div>
          <div className="mt-5 border-t border-white/5 pt-4"><div className="mb-2 flex justify-between text-[9px] font-mono text-slate-500"><span>SERVER PIPELINE</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.8)] transition-all duration-300" style={{ width: `${progress}%` }} /></div></div>
          {latestStep && <div className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-3 text-[9px] text-slate-500"><div className="mb-1 text-cyan-300">CURRENT EVENT</div>{latestStep.label}</div>}
        </div>
      </div>

      {failed && <div className="relative mx-4 mb-4 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 sm:mx-5"><AlertCircle className="mt-0.5 h-4 w-4 text-rose-400" /><div className="flex-1"><b className="text-rose-300">Task Failed:</b> {task.error || 'Execution encountered an unexpected issue.'}</div>{onRetry && <button onClick={onRetry} className="rounded-lg border border-rose-400/40 px-2 py-1 text-[10px] text-rose-200"><RefreshCw className="mr-1 inline h-3 w-3" />Retry</button>}</div>}
    </div>
  );
};