import React from 'react';
import {
  Clock,
  Brain,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { TaskRecord, TaskStatus } from '../types';

interface TaskPipelineStepperProps {
  task: TaskRecord;
  onRetry?: () => void;
}

export const TaskPipelineStepper: React.FC<TaskPipelineStepperProps> = ({ task, onRetry }) => {
  const steps: { key: TaskStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'waiting', label: 'Queued', icon: <Clock className="h-4 w-4" /> },
    { key: 'understanding', label: 'Intent & Routing', icon: <Brain className="h-4 w-4" /> },
    { key: 'working', label: 'Memory Grounding', icon: <Layers className="h-4 w-4" /> },
    { key: 'generating', label: 'AI Execution', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'checking', label: 'Quality Verification', icon: <Cpu className="h-4 w-4" /> },
    { key: 'completed', label: 'Ready', icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const getStatusIndex = (st: TaskStatus) => {
    switch (st) {
      case 'waiting':
        return 0;
      case 'understanding':
        return 1;
      case 'working':
        return 2;
      case 'generating':
        return 3;
      case 'checking':
        return 4;
      case 'completed':
        return 5;
      case 'failed':
        return -1;
      default:
        return 0;
    }
  };

  const currentIndex = getStatusIndex(task.status);
  const isFailed = task.status === 'failed';

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Cpu className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              JARVIS Execution Pipeline
            </h4>
            <p className="text-xs text-slate-300 font-medium truncate max-w-sm sm:max-w-md">
              Agent: <span className="text-white font-semibold">{task.agentName}</span>
            </p>
          </div>
        </div>

        {isFailed && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-1 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Task</span>
          </button>
        )}
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {steps.map((step, idx) => {
          const isCurrent = !isFailed && task.status === step.key;
          const isDone = !isFailed && currentIndex > idx;
          const isPending = !isFailed && currentIndex < idx;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition-all ${
                isCurrent
                  ? 'border border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : isDone
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : isFailed
                  ? 'border border-white/5 bg-white/5 text-slate-500'
                  : 'border border-white/5 bg-white/5 text-slate-400'
              }`}
            >
              <div
                className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                    : isDone
                    ? 'bg-emerald-500 text-slate-950'
                    : isFailed
                    ? 'bg-white/10 text-slate-500'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {step.icon}
              </div>
              <span className="text-[11px] font-semibold tracking-tight">{step.label}</span>
              {isCurrent && (
                <span className="mt-1 inline-block text-[9px] font-medium text-cyan-300 animate-pulse">
                  In progress...
                </span>
              )}
              {isDone && (
                <span className="mt-1 text-[9px] text-emerald-400 font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error display if failed */}
      {isFailed && (
        <div className="mt-3 flex items-start space-x-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-rose-300">Task Failed: </span>
            <span>{task.error || 'Execution encountered an unexpected issue.'}</span>
          </div>
        </div>
      )}

      {/* Step logs accordions */}
      {task.steps && task.steps.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-slate-400 space-y-1">
          {task.steps.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="font-mono text-slate-400">[{new Date(s.timestamp).toLocaleTimeString()}]</span>
              <span className="flex-1 px-2 truncate text-slate-300 font-medium">{s.label}</span>
              <span className="uppercase text-[9px] font-semibold text-cyan-400">{s.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
