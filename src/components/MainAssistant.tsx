import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  FileText,
  Zap,
  ArrowRight,
  RefreshCw,
  Cpu,
  GraduationCap,
  Megaphone,
  Clapperboard,
  BookOpenCheck,
  Languages,
} from 'lucide-react';
import {
  AgentDefinition,
  AttachedFile,
  JarvisSettings,
  TaskRecord,
} from '../types';
import { FileDropzone } from './FileDropzone';
import { VoiceAssistant } from './VoiceAssistant';
import { TaskPipelineStepper } from './TaskPipelineStepper';
import { ResultViewer } from './ResultViewer';
import { ApiService } from '../services/api';

interface MainAssistantProps {
  agents: AgentDefinition[];
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  settings: JarvisSettings;
  activeTask: TaskRecord | null;
  setActiveTask: (task: TaskRecord | null) => void;
  onTaskCompleted: (task: TaskRecord) => void;
  recentTasks: TaskRecord[];
  onOpenQuickBuilder: () => void;
}

export const MainAssistant: React.FC<MainAssistantProps> = ({
  agents,
  selectedAgentId,
  setSelectedAgentId,
  settings,
  activeTask,
  setActiveTask,
  onTaskCompleted,
  recentTasks,
  onOpenQuickBuilder,
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [predictedAgent, setPredictedAgent] = useState<AgentDefinition | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Quick Educational Suggestion Prompts
  const quickSuggestions = [
    {
      label: 'NEET Physics 45 Qs Bilingual',
      agent: 'neet-jee-paper',
      prompt: 'NEET Physics ke Current Electricity & Optics ke 45 questions ka bilingual paper banao with answer key and detailed step-by-step solutions.',
    },
    {
      label: 'Translate PDF to Bilingual Word',
      agent: 'pdf-bilingual',
      prompt: 'Is PDF ko read karo aur exact question structure maintain karte hue Hindi-English bilingual Word (.docx) format mein bana do.',
    },
    {
      label: 'JEE Maths 25 Qs Paper',
      agent: 'neet-jee-paper',
      prompt: 'JEE Main Mathematics ke Calculus and Matrices ke 25 standard questions create karo in bilingual format with answer key.',
    },
    {
      label: 'Genetics 15 Qs DPP',
      agent: 'dpp-generator',
      prompt: 'Class 12 NEET Biology: Genetics & Principles of Inheritance ke liye 15 medium to hard questions ka Daily Practice Sheet (DPP) with solutions generate karo.',
    },
    {
      label: 'Mock Test Notice & Poster',
      agent: 'poster-notice',
      prompt: 'Upcoming All India NEET Mock Test Series on Sunday at 10:00 AM ka formal circular notice aur professional promotional poster design karo.',
    },
    {
      label: 'Optics Trick 45s Reel Script',
      agent: 'reel-content',
      prompt: 'Optics ka Sign Convention yaad rakhne ka 45-second viral educational reel script with shot list, on-screen text, and Hinglish voiceover likho.',
    },
    {
      label: 'New Batch Social Post',
      agent: 'social-media',
      prompt: 'NEET 2026 Target Dropper Batch admissions open ke liye high-converting Instagram post with catchy hook, 5 key highlights, caption, and hashtags banao.',
    },
  ];

  // Predict agent autonomously as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!prompt.trim() && attachedFiles.length === 0) {
        setPredictedAgent(null);
        return;
      }
      try {
        const routeData = await ApiService.checkAgentRoute(prompt, attachedFiles, selectedAgentId);
        if (routeData?.agent) {
          setPredictedAgent(routeData.agent);
        }
      } catch (err) {
        console.warn('Route prediction error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [prompt, attachedFiles, selectedAgentId]);

  const handleExecute = async (customPrompt?: string, customAgentId?: string) => {
    const targetPrompt = customPrompt || prompt;
    if (!targetPrompt.trim() && attachedFiles.length === 0) return;

    setIsExecuting(true);

    // Initial placeholder task for stepper
    const targetAgentId = customAgentId || selectedAgentId;
    const resolvedAgent =
      targetAgentId !== 'auto'
        ? agents.find((a) => a.id === targetAgentId)
        : predictedAgent || agents[0];

    const initialTask: TaskRecord = {
      id: `task-${Date.now()}`,
      title: targetPrompt.slice(0, 60) || 'Document Processing',
      userPrompt: targetPrompt,
      agentId: resolvedAgent?.id || 'neet-jee-paper',
      agentName: resolvedAgent?.name || 'JARVIS Agent',
      status: 'understanding',
      createdAt: new Date().toISOString(),
      steps: [
        {
          status: 'understanding',
          label: `Routing intent to ${resolvedAgent?.name || 'Specialized Agent'}`,
          timestamp: new Date().toISOString(),
        },
      ],
      attachedFiles: [...attachedFiles],
    };

    setActiveTask(initialTask);

    try {
      const completedTask = await ApiService.executeTask({
        userPrompt: targetPrompt,
        selectedAgentId: targetAgentId,
        attachedFiles,
        model: settings.aiModel,
        settings,
      });

      setActiveTask(completedTask);
      onTaskCompleted(completedTask);
    } catch (err: any) {
      console.error('Task Execution Failed:', err);
      setActiveTask({
        ...initialTask,
        status: 'failed',
        error: err.message || 'Execution error occurred',
        completedAt: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSpeechInput = (transcript: string) => {
    setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* JARVIS Core Command Box (Frosted Glass Container) */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative">
        {/* Agent Selector / Autonomous Badge */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              JARVIS AI Assistant
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Active Agent:</span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
            >
              <option value="auto" className="bg-slate-900 text-cyan-300">✨ Autonomous Auto-Routing</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Textarea Input (Frosted Glass Input Bar) */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command for JARVIS in Hindi, English, or Hinglish (e.g. 'NEET Physics ke 45 questions ka bilingual paper banao' or 'Is PDF ko read karke Word bana do')..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none font-sans leading-relaxed transition-all"
          />

          {/* Autonomously Detected Agent Preview Badge */}
          {selectedAgentId === 'auto' && predictedAgent && prompt.trim() && (
            <div className="absolute right-3 bottom-3 flex items-center space-x-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-300 backdrop-blur-md shadow-sm">
              <Bot className="h-3.5 w-3.5 text-cyan-400" />
              <span>Routing to: <strong className="text-white">{predictedAgent.name}</strong></span>
            </div>
          )}
        </div>

        {/* Input Bar Controls (Attach, Voice, Submit) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Attachments & Voice */}
          <div className="flex flex-wrap items-center gap-2">
            <FileDropzone
              attachedFiles={attachedFiles}
              onAddFiles={(files) => setAttachedFiles((prev) => [...prev, ...files])}
              onRemoveFile={(id) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id))}
              disabled={isExecuting}
            />

            <VoiceAssistant
              onSpeechResult={handleSpeechInput}
              isProcessing={isExecuting}
            />
          </div>

          {/* Right: Submit Button with Glowing Cyan Theme */}
          <button
            type="button"
            id="btn-execute-jarvis-task"
            disabled={isExecuting || (!prompt.trim() && attachedFiles.length === 0)}
            onClick={() => handleExecute()}
            className="flex items-center space-x-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <span>Execute with JARVIS</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Quick Workflows (One-Click Execute)</span>
            </span>
            <button
              onClick={onOpenQuickBuilder}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              + Custom Exam Builder
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(item.prompt);
                  setSelectedAgentId(item.agent);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="group flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-cyan-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Task Stepper & Execution Progress */}
      {activeTask && (
        <div className="space-y-4">
          <TaskPipelineStepper
            task={activeTask}
            onRetry={() => handleExecute(activeTask.userPrompt, activeTask.agentId)}
          />

          {/* Render Result when Completed */}
          {activeTask.status === 'completed' && activeTask.result && (
            <ResultViewer
              task={activeTask}
              onRepeat={() => {
                setPrompt(activeTask.userPrompt);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      )}

      {/* Recent Tasks List (If no active task) */}
      {!activeTask && recentTasks.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
            <Bot className="h-4 w-4 text-cyan-400" />
            <span>Recent Completed Tasks</span>
          </h3>
          <div className="space-y-2">
            {recentTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveTask(task)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10"
              >
                <div className="flex items-center space-x-3 flex-1 truncate">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {task.agentName} • {new Date(task.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-medium text-cyan-400 hover:text-cyan-300">
                  Open →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
