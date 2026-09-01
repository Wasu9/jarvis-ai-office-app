import React from 'react';
import { Activity, Bot, BrainCircuit, Cpu, FolderKanban, History, Settings, Sparkles, Zap } from 'lucide-react';
import { JarvisSettings } from '../types';

interface HeaderProps {
  activeTab: 'assistant'|'agents'|'files'|'memory'|'history';
  setActiveTab: (tab:'assistant'|'agents'|'files'|'memory'|'history')=>void;
  onOpenSettings:()=>void; onOpenQuickBuilder:()=>void;
  isAiConfigured:boolean; settings:JarvisSettings; taskCount:number;
}

const nav = [
  ['assistant','Command',Bot], ['agents','Agents',Sparkles], ['files','Workspace',FolderKanban],
  ['memory','Memory',BrainCircuit], ['history','Activity',History],
] as const;

export const Header:React.FC<HeaderProps> = ({activeTab,setActiveTab,onOpenSettings,onOpenQuickBuilder,isAiConfigured,settings,taskCount}) => (
  <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#070912]/80 backdrop-blur-2xl">
    <div className="mx-auto flex max-w-[1700px] items-center gap-4 px-4 py-3 lg:px-6">
      <button onClick={()=>setActiveTab('assistant')} className="group flex min-w-0 items-center gap-3 text-left">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/25 to-cyan-400/10 shadow-[0_0_35px_rgba(124,92,255,.18)]">
          <Cpu className="h-5 w-5 text-violet-200 transition-transform group-hover:rotate-12"/>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]"/>
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-2"><span className="text-base font-black tracking-[.16em] text-white">JARVIS</span><span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-0.5 text-[8px] font-bold tracking-widest text-violet-200">AI OS</span></div>
          <div className="truncate text-[9px] uppercase tracking-[.14em] text-slate-500">{settings.instituteName || 'Intelligent Office'}</div>
        </div>
      </button>
      <nav className="hidden flex-1 justify-center md:flex"><div className="flex items-center gap-1 rounded-2xl border border-white/[.07] bg-white/[.025] p-1.5 shadow-inner">
        {nav.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveTab(id)} className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-semibold transition-all ${activeTab===id?'bg-white/[.09] text-white shadow-[0_6px_25px_rgba(0,0,0,.18)]':'text-slate-500 hover:bg-white/[.04] hover:text-slate-200'}`}><Icon className={`h-3.5 w-3.5 ${activeTab===id?'text-violet-300':'text-slate-600'}`}/>{label}{id==='history'&&taskCount>0&&<span className="rounded-full bg-violet-400/15 px-1.5 text-[8px] text-violet-200">{taskCount}</span>}{activeTab===id&&<span className="absolute inset-x-4 -bottom-1 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent"/>}</button>)}
      </div></nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 lg:flex"><Activity className="h-3.5 w-3.5 text-emerald-300"/><span className="text-[9px] font-bold tracking-wider text-slate-400">{isAiConfigured?'CORE READY':'CONFIG REQUIRED'}</span></div>
        <button onClick={onOpenQuickBuilder} className="flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-[10px] font-bold text-violet-200 transition hover:bg-violet-400/20"><Zap className="h-3.5 w-3.5"/><span className="hidden sm:inline">CREATE</span></button>
        <button onClick={onOpenSettings} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-slate-400 transition hover:border-white/15 hover:text-white" title="Settings"><Settings className="h-4 w-4"/></button>
      </div>
    </div>
    <div className="border-t border-white/[.04] px-2 py-1.5 md:hidden"><div className="grid grid-cols-5 gap-1">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveTab(id)} className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[9px] ${activeTab===id?'bg-violet-400/10 text-violet-200':'text-slate-500'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div></div>
  </header>
);
