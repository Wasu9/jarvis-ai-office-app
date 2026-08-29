import React, { useState, useEffect } from 'react';
import {
  AgentDefinition,
  AttachedFile,
  JarvisMemoryItem,
  JarvisSettings,
  TaskRecord,
} from './types';
import { ApiService, DEFAULT_SETTINGS } from './services/api';
import { Header } from './components/Header';
import { MainAssistant } from './components/MainAssistant';
import { AgentManager } from './components/AgentManager';
import { FileManager } from './components/FileManager';
import { MemoryManager } from './components/MemoryManager';
import { TaskHistory } from './components/TaskHistory';
import { SettingsModal } from './components/SettingsModal';
import { QuickExamBuilder } from './components/QuickExamBuilder';

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'agents' | 'files' | 'memory' | 'history'>('assistant');
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('auto');
  const [memories, setMemories] = useState<JarvisMemoryItem[]>([]);
  const [settings, setSettings] = useState<JarvisSettings>(DEFAULT_SETTINGS);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickBuilderOpen, setIsQuickBuilderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Settings, Agents, Memories, and Tasks on Mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // Load Settings from LocalStorage if available
        const savedSettings = localStorage.getItem('jarvis_settings');
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch {}
        }

        // Load Task History from LocalStorage
        const savedTasks = localStorage.getItem('jarvis_task_history');
        if (savedTasks) {
          try {
            const parsedTasks: TaskRecord[] = JSON.parse(savedTasks);
            setTasks(parsedTasks);
            if (parsedTasks.length > 0) {
              setActiveTask(parsedTasks[0]);
            }
          } catch {}
        }

        // Load uploaded files list from local storage
        const savedFiles = localStorage.getItem('jarvis_uploaded_files');
        if (savedFiles) {
          try {
            setUploadedFiles(JSON.parse(savedFiles));
          } catch {}
        }

        // Fetch agents from API
        const agentsData = await ApiService.getAgents();
        setAgents(agentsData);

        // Fetch memories from API
        const memoriesData = await ApiService.getMemories();
        setMemories(memoriesData);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const refreshAgents = async () => {
    try {
      const data = await ApiService.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to refresh agents:', err);
    }
  };

  const refreshMemories = async () => {
    try {
      const data = await ApiService.getMemories();
      setMemories(data);
    } catch (err) {
      console.error('Failed to refresh memories:', err);
    }
  };

  const handleSaveSettings = (newSettings: JarvisSettings) => {
    setSettings(newSettings);
    localStorage.setItem('jarvis_settings', JSON.stringify(newSettings));
  };

  const handleTaskCompleted = (completedTask: TaskRecord) => {
    setTasks((prev) => {
      const updated = [completedTask, ...prev.filter((t) => t.id !== completedTask.id)];
      localStorage.setItem('jarvis_task_history', JSON.stringify(updated.slice(0, 50)));
      return updated;
    });

    // Save any attached files to workspace
    if (completedTask.attachedFiles && completedTask.attachedFiles.length > 0) {
      setUploadedFiles((prev) => {
        const fileMap = new Map(prev.map((f) => [f.id, f]));
        for (const file of completedTask.attachedFiles!) {
          fileMap.set(file.id, file);
        }
        const updatedFiles = Array.from(fileMap.values());
        localStorage.setItem('jarvis_uploaded_files', JSON.stringify(updatedFiles));
        return updatedFiles;
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      localStorage.setItem('jarvis_task_history', JSON.stringify(updated));
      return updated;
    });
    if (activeTask?.id === taskId) {
      setActiveTask(null);
    }
  };

  const handleClearAllHistory = () => {
    setTasks([]);
    setActiveTask(null);
    localStorage.removeItem('jarvis_task_history');
  };

  const handleDeleteUploadedFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      localStorage.setItem('jarvis_uploaded_files', JSON.stringify(updated));
      return updated;
    });
  };

  const handleProcessFileFromWorkspace = (file: AttachedFile) => {
    setActiveTab('assistant');
  };

  // Compile all generated artifacts from history
  const allGeneratedArtifacts = tasks.flatMap((t) =>
    (t.result?.artifacts || []).map((art) => ({
      artifact: art,
      taskTitle: t.title,
      date: t.completedAt || t.createdAt,
    }))
  );

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative overflow-x-hidden">
      {/* Subtle ambient light orbs for frosted glass depth */}
      <div className="fixed top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px] pointer-events-none" />

      {/* Primary Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQuickBuilder={() => setIsQuickBuilderOpen(true)}
        isAiConfigured={true}
        settings={settings}
        taskCount={tasks.length}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-6 md:p-8">
        {activeTab === 'assistant' && (
          <MainAssistant
            agents={agents}
            selectedAgentId={selectedAgentId}
            setSelectedAgentId={setSelectedAgentId}
            settings={settings}
            activeTask={activeTask}
            setActiveTask={setActiveTask}
            onTaskCompleted={handleTaskCompleted}
            recentTasks={tasks}
            onOpenQuickBuilder={() => setIsQuickBuilderOpen(true)}
          />
        )}

        {activeTab === 'agents' && (
          <AgentManager
            agents={agents}
            onSelectAgent={(agentId) => {
              setSelectedAgentId(agentId);
              setActiveTab('assistant');
            }}
            onRefreshAgents={refreshAgents}
            onUsePrompt={(promptText, agentId) => {
              setSelectedAgentId(agentId);
              setActiveTab('assistant');
            }}
          />
        )}

        {activeTab === 'files' && (
          <FileManager
            uploadedFiles={uploadedFiles}
            generatedArtifacts={allGeneratedArtifacts}
            onUploadFile={(files) => {
              setUploadedFiles((prev) => {
                const updated = [...files, ...prev];
                localStorage.setItem('jarvis_uploaded_files', JSON.stringify(updated));
                return updated;
              });
            }}
            onDeleteUploadedFile={handleDeleteUploadedFile}
            onProcessFile={handleProcessFileFromWorkspace}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryManager
            memories={memories}
            onRefreshMemories={refreshMemories}
          />
        )}

        {activeTab === 'history' && (
          <TaskHistory
            tasks={tasks}
            onOpenTask={(task) => {
              setActiveTask(task);
              setActiveTab('assistant');
            }}
            onRepeatTask={(task) => {
              setSelectedAgentId(task.agentId);
              setActiveTab('assistant');
            }}
            onDeleteTask={handleDeleteTask}
            onClearHistory={handleClearAllHistory}
          />
        )}

        {/* Frosted Glass System Status Footer */}
        <footer className="mt-8 mx-auto max-w-5xl w-full py-2.5 px-5 bg-white/5 border border-white/10 rounded-full flex flex-wrap items-center justify-between text-[11px] text-slate-400 backdrop-blur-md shadow-lg shadow-black/20 gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              JARVIS System Online
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              {agents.length} Autonomous Agents Ready
            </span>
          </div>
          <div className="flex items-center gap-5 text-[10px] text-slate-400 font-mono">
            <span>Model: {settings.aiModel}</span>
            <span>Memory: {memories.length} Grounded</span>
            <span className="text-cyan-400">v2.0.4-Stable</span>
          </div>
        </footer>
      </main>

      {/* Quick Exam Paper & DPP Builder Modal */}
      <QuickExamBuilder
        isOpen={isQuickBuilderOpen}
        onClose={() => setIsQuickBuilderOpen(false)}
        onSubmit={async (promptText, agentId) => {
          setSelectedAgentId(agentId);
          setActiveTab('assistant');
          try {
            const task = await ApiService.executeTask({
              userPrompt: promptText,
              selectedAgentId: agentId,
              model: settings.aiModel,
              settings,
            });
            setActiveTask(task);
            handleTaskCompleted(task);
          } catch (err: any) {
            console.error('Quick builder execution error:', err);
          }
        }}
        settings={settings}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
