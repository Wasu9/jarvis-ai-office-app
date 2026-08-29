import React, { useState } from 'react';
import {
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  RotateCcw,
  Eye,
  FileText,
  Search,
  Bot,
} from 'lucide-react';
import { TaskRecord } from '../types';

interface TaskHistoryProps {
  tasks: TaskRecord[];
  onOpenTask: (task: TaskRecord) => void;
  onRepeatTask: (task: TaskRecord) => void;
  onDeleteTask: (id: string) => void;
  onClearHistory: () => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  tasks,
  onOpenTask,
  onRepeatTask,
  onDeleteTask,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userPrompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <History className="h-5 w-5 text-cyan-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white tracking-tight sm:text-2xl">
              JARVIS Task History
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Audit log of all processed questions, bilingual papers, posters, and script generations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {tasks.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all task history?')) onClearHistory();
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-all backdrop-blur-md"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-xs text-slate-400 backdrop-blur-xl">
          No tasks found in history. Type a command in JARVIS Assistant to execute your first task!
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isSuccess = task.status === 'completed';
            const docxArtifact = task.result?.artifacts?.find((a) => a.fileType === 'docx');

            return (
              <div
                key={task.id}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl transition-all hover:border-cyan-500/30 sm:flex-row sm:items-center"
              >
                <div className="flex items-start space-x-3.5 flex-1">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      isSuccess
                        ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'border-rose-500/30 bg-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-white max-w-md truncate">
                        {task.title}
                      </h4>
                      <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300 backdrop-blur-md">
                        {task.agentName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      "{task.userPrompt}"
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(task.createdAt).toLocaleString()}</span>
                      </span>
                      {task.attachedFiles && task.attachedFiles.length > 0 && (
                        <span>• {task.attachedFiles.length} file(s) attached</span>
                      )}
                      {task.result?.artifacts && (
                        <span>• {task.result.artifacts.length} artifact(s)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-end space-x-2 border-t border-white/10 pt-2 sm:mt-0 sm:border-t-0 sm:pt-0">
                  <button
                    onClick={() => onOpenTask(task)}
                    className="flex items-center space-x-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Result</span>
                  </button>

                  <button
                    onClick={() => onRepeatTask(task)}
                    className="flex items-center space-x-1 rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all"
                    title="Repeat / Run again"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Repeat</span>
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-xl p-1.5 text-slate-500 hover:bg-white/10 hover:text-rose-400 transition-all"
                    title="Delete record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
