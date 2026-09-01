import React from 'react';
import { Activity, Bot, BrainCircuit, Cpu, FolderKanban, History, Settings, Sparkles, Zap, Plus } from 'lucide-react';
import { JarvisSettings } from '../types';

interface HeaderProps { activeTab:'assistant'|'agents'|'files'|'memory'|'history'; setActiveTab:(tab:'assistant'|'agents'|'files'|'memory'|'history')=>void; onOpenSettings:()=>void; onOpenQuickBuilder:()=>void; isAiConfigured:boolean; settings:JarvisSettings; taskCount:number; }
const nav=[['assistant','Command',Bot],['agents','AI Team',Sparkles],['files','Workspace',FolderKanban],['memory','Memory',BrainCircuit],['history','Activity',History]] as const;
export const Header:React.FC<HeaderProps>=({activeTab,setActiveTab,onOpenSettings,onOpenQuickBuilder,isAiConfigured,settings,taskCount})=><>
<aside className="jarvis-sidebar">
 <button className="jarvis-brand" onClick={()=>setActiveTab('assistant')}><span className="jarvis-orb"><Cpu className="h-5 w-5"/><i/></span><span className="brand-copy"><strong>JARVIS</strong><small>AI OFFICE</small></span></button>
 <div className="sidebar-status"><span className={isAiConfigured?'status-dot online':'status-dot'}/><span>{isAiConfigured?'CORE ONLINE':'CORE SETUP'}</span></div>
 <nav className="sidebar-nav"><span className="nav-caption">COMMAND DECK</span>{nav.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveTab(id)} className={`side-nav-item ${activeTab===id?'active':''}`}><Icon/><span>{label}</span>{id==='history'&&taskCount>0&&<b>{taskCount}</b>}</button>)}</nav>
 <div className="sidebar-spacer"/>
 <div className="sidebar-card"><div><span>JARVIS CORE</span><Activity/></div><strong>{settings.aiModel}</strong><div className="core-meter"><i/></div><small>Ready for your next mission</small></div>
 <button className="side-create" onClick={onOpenQuickBuilder}><Plus/> New creation</button>
 <button className="side-settings" onClick={onOpenSettings}><Settings/> Settings</button>
 <div className="sidebar-footer">{settings.instituteName||'Intelligent Office'}</div>
</aside>
<header className="mobile-topbar"><button className="mobile-brand" onClick={()=>setActiveTab('assistant')}><span className="jarvis-orb small"><Cpu/></span><strong>JARVIS</strong></button><div className="mobile-actions"><span className={isAiConfigured?'status-dot online':'status-dot'}/><button onClick={onOpenQuickBuilder}><Zap/></button><button onClick={onOpenSettings}><Settings/></button></div></header>
<div className="mobile-nav">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveTab(id)} className={activeTab===id?'active':''}><Icon/><span>{label}</span></button>)}</div>
</>;
