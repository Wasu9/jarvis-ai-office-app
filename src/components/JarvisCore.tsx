import React from 'react';
import { Activity, Cpu, Droplets, Fan, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { TaskRecord } from '../types';

interface Props { activeTask: TaskRecord | null; employeeCount?: number; }

const stageLabels = ['UNDERSTAND','ROUTE','EXECUTE','VERIFY','DELIVER'];

export const JarvisCore: React.FC<Props> = ({ activeTask, employeeCount = 0 }) => {
  const running = !!activeTask && activeTask.status !== 'completed' && activeTask.status !== 'failed';
  const failed = activeTask?.status === 'failed';
  const steps = activeTask?.steps || [];
  const progress = activeTask?.status === 'completed' ? 100 : Math.min(94, Math.max(8, steps.length * 18));
  const activeIndex = Math.min(stageLabels.length - 1, Math.max(0, steps.length - 1));

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#071017] p-3 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(34,211,238,.12),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,.08),transparent_35%)]" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.22em] text-cyan-200">
            <span className={`h-2 w-2 rounded-full ${failed ? 'bg-rose-400' : running ? 'animate-pulse bg-cyan-300' : 'bg-emerald-400'}`} />
            JARVIS CORE
          </div>
          <div className="mt-1 text-[9px] text-slate-500">Neural command engine · {employeeCount} specialists connected</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[8px] text-slate-400">
          <ShieldCheck className="h-3 w-3 text-emerald-300" /> {failed ? 'ATTENTION' : running ? 'PROCESSING' : 'READY'}
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-[92px_1fr] items-center gap-3">
        <div className="relative mx-auto h-[92px] w-[92px] rounded-[22px] border border-cyan-300/20 bg-[#03070b] shadow-[inset_0_0_28px_rgba(34,211,238,.08),0_0_22px_rgba(34,211,238,.08)]">
          <div className="absolute inset-2 rounded-[17px] border border-slate-700/80" />
          <div className="absolute inset-4 rounded-full border border-cyan-300/20" />
          <div className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/40 bg-cyan-300/10 ${running ? 'animate-pulse' : ''}`}>
            <Cpu className="m-2 h-4 w-4 text-cyan-200" />
          </div>
          {[0,1,2,3].map(i => <div key={i} className="absolute left-1/2 top-1/2 h-1.5 w-7 origin-left rounded-full bg-cyan-300/25" style={{ transform: `translateY(-50%) rotate(${i * 90}deg)` }} />)}
          <div className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
        </div>

        <div className="min-w-0">
          <div className="flex items-end justify-between text-[9px]">
            <span className="text-slate-500">TASK TELEMETRY</span>
            <span className="font-mono text-cyan-200">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full transition-all duration-700 ${failed ? 'bg-rose-400' : 'bg-cyan-300'}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {stageLabels.map((label, i) => <div key={label} className="text-center">
              <div className={`mx-auto h-1.5 w-1.5 rounded-full ${i < activeIndex || (i === activeIndex && running) ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.8)]' : i === activeIndex && !running && !failed ? 'bg-emerald-300' : 'bg-slate-700'}`} />
              <div className="mt-1 truncate text-[6px] tracking-wide text-slate-600">{label}</div>
            </div>)}
          </div>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-1.5 text-[8px]">
        <div className="rounded-xl border border-white/5 bg-black/20 p-2"><Gauge className="mb-1 h-3 w-3 text-cyan-300" /><span className="text-slate-500">CORE</span><div className="mt-0.5 font-mono text-slate-200">{running ? 'ACTIVE' : 'IDLE'}</div></div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-2"><Droplets className="mb-1 h-3 w-3 text-cyan-300" /><span className="text-slate-500">COOLING</span><div className="mt-0.5 font-mono text-slate-200">OPTIMAL</div></div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-2"><Activity className="mb-1 h-3 w-3 text-cyan-300" /><span className="text-slate-500">NEURAL</span><div className="mt-0.5 font-mono text-slate-200">{running ? 'LIVE' : 'READY'}</div></div>
      </div>

      <div className="relative mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[7px] tracking-[.16em] text-slate-600">
        <span><Zap className="mr-1 inline h-2.5 w-2.5 text-cyan-300" />COMMAND CORE</span>
        <span><Fan className="mr-1 inline h-2.5 w-2.5" />THERMAL CONTROL</span>
      </div>
    </section>
  );
};
