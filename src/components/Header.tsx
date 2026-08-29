import React from 'react';
import {
  Cpu,
  Bot,
  FolderKanban,
  BrainCircuit,
  History,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { JarvisSettings } from '../types';

interface HeaderProps {
  activeTab: 'assistant' | 'agents' | 'files' | 'memory' | 'history';
  setActiveTab: (tab: 'assistant' | 'agents' | 'files' | 'memory' | 'history') => void;
  onOpenSettings: () => void;
  onOpenQuickBuilder: () => void;
  isAiConfigured: boolean;
  settings: JarvisSettings;
  taskCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenQuickBuilder,
  isAiConfigured,
  settings,
  taskCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#05060f]/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
        {/* Left: Brand Identity with Glowing Cyan Glass Emblem */}
        <div className="flex items-center space-x-3">
          <div
            onClick={() => setActiveTab('assistant')}
            className="group flex cursor-pointer items-center space-x-3"
            id="jarvis-brand-logo"
          >
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform group-hover:scale-105">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-white uppercase sm:text-xl">
                  JARVIS <span className="text-cyan-400">AI OFFICE</span>
                </h1>
                <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-medium text-slate-300">PRO</span>
                </div>
              </div>
              <p className="hidden text-[10px] text-slate-400 tracking-wider uppercase sm:block">
                {settings.instituteName || 'Professional Institute Workspace'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Frosted Glass Container) */}
        <nav className="hidden items-center rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md md:flex" id="header-nav-tabs">
          <button
            id="nav-tab-assistant"
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'assistant'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Assistant</span>
          </button>

          <button
            id="nav-tab-agents"
            onClick={() => setActiveTab('agents')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'agents'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Agents</span>
          </button>

          <button
            id="nav-tab-files"
            onClick={() => setActiveTab('files')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Files</span>
          </button>

          <button
            id="nav-tab-memory"
            onClick={() => setActiveTab('memory')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'memory'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Memory</span>
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
            {taskCount > 0 && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-cyan-300">
                {taskCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right: Model status badge & Quick Action & Settings */}
        <div className="flex items-center space-x-2.5">
          {/* Active Model Pill Badge */}
          <div className="hidden lg:flex bg-white/5 border border-white/10 px-3 py-1.5 rounded-full items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-300">{settings.aiModel}</span>
          </div>

          <button
            id="btn-quick-paper-builder"
            onClick={onOpenQuickBuilder}
            className="flex items-center space-x-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Quick Paper/DPP</span>
            <span className="sm:hidden">Create</span>
          </button>

          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sub-navigation bar */}
      <div className="flex border-t border-white/10 bg-[#05060f]/80 backdrop-blur-xl px-2 py-1.5 md:hidden">
        <div className="grid w-full grid-cols-5 gap-1">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium ${
              activeTab === 'assistant' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>JARVIS</span>
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium ${
              activeTab === 'agents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Agents</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium ${
              activeTab === 'files' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Files</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium ${
              activeTab === 'memory' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Memory</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium ${
              activeTab === 'history' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </button>
        </div>
      </div>
    </header>
  );
};
