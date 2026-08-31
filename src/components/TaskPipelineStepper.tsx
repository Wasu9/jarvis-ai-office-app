import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Brain, Cpu, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Layers, Terminal, Zap } from 'lucide-react';
import { TaskRecord, TaskStatus } from '../types';

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
  const failed = task.status === 'failed';
  const realIndex = statusIndex(task.status);
  const [pulse, setPulse] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(12);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (failed || task.status === 'completed') return;
    const timer = window.setInterval(() => {
      setPulse(v => (v + 1) % 4);
      setTick(v => v + 1);
      setFakeProgress(v => Math.min(96, v + (Math.random() > 0.72 ? 3 : 1)));
    }, 650);
    return () => window.clearInterval(timer);
  }, [failed, task.status]);

  const terminalLines = useMemo(() => [
    `> jarvis.init --agent ${task.agentName}`,
    '> loading memory context... OK',
    '> validating task contract... OK',
    '> connecting neural execution layer...',
    `> pipeline.status = ${task.status.toUpperCase()}`,
    '> preserving bilingual + mathematical fidelity...',
    '> streaming structured generation...',
    '> quality gates armed...',
  ], [task.agentName, task.status]);

  const activeIndex = failed ? -1 : Math.max(realIndex, realIndex < 5 ? Math.min(4, Math.floor(fakeProgress / 22)) : realIndex);
  const progress = task.status === 'completed' ? 100 : failed ? 0 : Math.max(fakeProgress, (realIndex + 1) * 15);

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#07111c]/80 shadow-[0_0_40px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <div className="relative h-1 overflow-hidden bg-white/5"><div className="absolute inset-y-0 left-0 bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.9)] transition-all duration-500" style={{ width: `${progress}%` }} /><div className="absolute inset-y-0 w-24 bg-white/60 blur-md animate-[scan_1.4s_linear_infinite]" /></div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_22px_rgba(6,182,212,0.25)]">
              <Cpu className="h-5 w-5 animate-spin" />
              {!failed && task.status !== 'completed' && <span className="absolute inset-0 rounded-xl border border-cyan-300/40 animate-ping" />}
            </div>
            <div><h4 className="text-sm font-black tracking-widest text-cyan-300">JARVIS // EXECUTION CORE</h4><p className="text-xs text-slate-400">Agent: <span className="text-white">{task.agentName}</span></p></div>
          </div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-right"><div className="text-lg font-black tabular-nums text-cyan-300">{Math.round(progress)}%</div><div className="text-[9px] tracking-[0.2em] text-slate-500">PROCESS</div></div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
          {phases.map((p, i) => { const done = !failed && (realIndex > i || task.status === 'completed'); const current = !failed && (i === realIndex || (realIndex < 5 && i === activeIndex)); return <div key={p.key} className={`relative overflow-hidden rounded-xl border p-2.5 transition-all duration-500 ${current ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_20px_rgba(6,182,212,0.18)]' : done ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-white/5 bg-white/[0.03]'}`}><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${current ? 'bg-cyan-400 text-slate-950 animate-pulse' : done ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-500'}`}>{p.icon}</div><div className="text-[9px] font-black tracking-wider text-slate-300">{p.label}</div>{current && <div className="mt-1 flex gap-0.5">{[0,1,2].map(n => <span key={n} className={`h-1 w-1 rounded-full bg-cyan-300 ${n <= pulse ? 'opacity-100' : 'opacity-30'}`} />)}</div>}</div>; })}
        </div>

        <div className="grid gap-3 md:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-black/30">
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2"><div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-cyan-300"><Terminal className="h-3.5 w-3.5" /> LIVE TASK STREAM</div><div className="flex items-center gap-1 text-[9px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</div></div>
            <div className="space-y-1 p-3 font-mono text-[10px] leading-5 text-slate-400">{terminalLines.slice(0, 5 + (tick % 4)).map((line, i) => <div key={i} className={`${i === (tick % 4) ? 'text-cyan-200' : ''}`}><span className="mr-2 text-cyan-500/60">{String(i + 1).padStart(2, '0')}</span>{line}<span className="ml-1 animate-pulse">{i === 4 && !failed ? '▌' : ''}</span></div>)}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/5 to-violet-400/5 p-4"><div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl animate-pulse" /><div className="relative"><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400"><Zap className="h-3.5 w-3.5 text-cyan-300" /> CORE ACTIVITY</div><div className="space-y-3">{['Neural routing','Context loading','Content synthesis','Quality gates'].map((x,i)=><div key={x}><div className="mb-1 flex justify-between text-[9px]"><span className="text-slate-400">{x}</span><span className="text-cyan-300">{Math.min(100, Math.max(8, progress - i*11))}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)] transition-all duration-700" style={{width:`${Math.min(100, Math.max(8, progress - i*11))}%`}} /></div></div>)}</div></div></div>
        </div>

        {failed && <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 text-rose-400" /><div className="flex-1"><b className="text-rose-300">Task Failed:</b> {task.error || 'Execution encountered an unexpected issue.'}</div>{onRetry && <button onClick={onRetry} className="rounded-lg border border-rose-400/40 px-2 py-1 text-[10px] text-rose-200">Retry</button>}</div>}
        {task.steps?.length ? <div className="mt-3 border-t border-white/5 pt-2 font-mono text-[9px] text-slate-500">{task.steps.map((s,i)=><div key={i} className="flex gap-2"><span>[{new Date(s.timestamp).toLocaleTimeString()}]</span><span className="text-slate-400">{s.label}</span></div>)}</div> : null}
      </div>
    </div>
  );
};
