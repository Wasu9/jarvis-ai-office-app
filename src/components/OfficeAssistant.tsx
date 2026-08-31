import React, { useRef, useState } from 'react';
import { ArrowUp, BriefcaseBusiness, Coffee, FileText, MessageSquare, RotateCcw, X, ClipboardList, Building2 } from 'lucide-react';
import { AgentDefinition, AttachedFile, JarvisSettings, TaskRecord } from '../types';
import { FileDropzone } from './FileDropzone';
import { VoiceAssistant } from './VoiceAssistant';
import { TaskPipelineStepper } from './TaskPipelineStepper';
import { ResultViewer } from './ResultViewer';
import { ApiService } from '../services/api';

interface Props { agents: AgentDefinition[]; selectedAgentId: string; setSelectedAgentId: (id: string) => void; settings: JarvisSettings; activeTask: TaskRecord | null; setActiveTask: (t: TaskRecord | null) => void; onTaskCompleted: (t: TaskRecord) => void; onAgentHired?: () => void; recentTasks: TaskRecord[]; }
type Msg = { id: string; role: 'user' | 'assistant'; content: string };

const quick = [
  ['NEET Paper', 'Create a NEET Physics paper with bilingual English-Hindi questions and options.'],
  ['PDF to Word', 'Read the attached PDF and convert it into a clean bilingual Word document.'],
  ['DPP', 'Create a NEET DPP with questions, answer key and detailed solutions.'],
  ['Academy Notice', 'Create a professional Shaheen Academy Jaipur notice for an upcoming mock test.'],
];

const roomNames = ['Paper Lab','Document Desk','DPP Room','Design Studio','Research Room','QA Room','Media Room','Data Room'];
const deskPos = [
  {x:'8%',y:'19%'},{x:'28%',y:'19%'},{x:'48%',y:'19%'},{x:'68%',y:'19%'},
  {x:'18%',y:'52%'},{x:'38%',y:'52%'},{x:'58%',y:'52%'},{x:'78%',y:'52%'}
];

export const OfficeAssistant: React.FC<Props> = (p) => {
  const { agents, selectedAgentId, setSelectedAgentId, settings, activeTask, setActiveTask, onTaskCompleted, onAgentHired, recentTasks } = p;
  const [messages, setMessages] = useState<Msg[]>([{id:'welcome',role:'assistant',content:'Good to see you, Boss. 👋 The office is open. Talk to me normally, or give me a real mission.'}]);
  const [prompt,setPrompt]=useState('');
  const [files,setFiles]=useState<AttachedFile[]>([]);
  const [busy,setBusy]=useState(false);
  const [advanced,setAdvanced]=useState(false);
  const ref=useRef<HTMLTextAreaElement>(null);
  const enabled=agents.filter(a=>a.enabled).slice(0,8);
  const completed=recentTasks.filter(t=>t.status==='completed').length;

  const reset=()=>{setMessages([{id:Date.now().toString(),role:'assistant',content:'Fresh office session. ☕ Everyone is back at their desks. What shall we work on?'}]);setPrompt('');setFiles([]);setActiveTask(null);};

  const send=async(custom?:string)=>{
    const text=(custom??prompt).trim(); if(!text&&!files.length)return;
    const userText=text||'Process the attached file.';
    const history=messages.slice(-12).map(m=>({role:m.role,content:m.content}));
    setMessages(m=>[...m,{id:`u${Date.now()}`,role:'user',content:userText}]); setPrompt(''); setBusy(true);
    const pending:TaskRecord={id:`p${Date.now()}`,title:userText.slice(0,70),userPrompt:userText,agentId:selectedAgentId==='auto'?'jarvis':'selected',agentName:'JARVIS',status:'understanding',createdAt:new Date().toISOString(),steps:[{status:'understanding',label:'JARVIS is understanding the mission',timestamp:new Date().toISOString()}],attachedFiles:[...files]};
    setActiveTask(pending);
    try{
      const t=await ApiService.executeTask({userPrompt:userText,selectedAgentId,attachedFiles:files,model:settings.aiModel,settings,history});
      setActiveTask(t);
      if(t.agentId==='conversational-core'){setMessages(m=>[...m,{id:`a${Date.now()}`,role:'assistant',content:t.result?.rawText||'I am ready.'}]);setActiveTask(null);}
      else{if(t.steps?.some(s=>s.label.toLowerCase().includes('hr hired')))onAgentHired?.();onTaskCompleted(t);}
    }catch(e:any){setActiveTask({...pending,status:'failed',error:e.message||'Something went wrong',completedAt:new Date().toISOString()});}
    finally{setBusy(false);setFiles([]);}
  };

  const getWorkerIndex=(task:TaskRecord|null)=>{
    if(!task)return -1;
    const exact=enabled.findIndex(a=>a.id===task.agentId||a.name===task.agentName);
    if(exact>=0)return exact;
    const s=(task.userPrompt||'').toLowerCase();
    if(/pdf|word|document|bilingual|translate/.test(s))return Math.min(1,enabled.length-1);
    if(/dpp|practice|question|neet|jee|paper|physics|chemistry|biology/.test(s))return 0;
    if(/design|poster|notice|social|image|reel|video/.test(s))return Math.min(3,enabled.length-1);
    if(/research|search|study/.test(s))return Math.min(4,enabled.length-1);
    return enabled.length?0:-1;
  };
  const worker=getWorkerIndex(activeTask);

  return <div className="mx-auto w-full max-w-[1800px] text-slate-100">
    <style>{`
      @keyframes officeGlow{0%,100%{opacity:.45}50%{opacity:1}}
      @keyframes screenFlicker{0%,100%{opacity:.65}50%{opacity:1}75%{opacity:.8}}
      @keyframes personWalk{0%{transform:translate(0,0)}45%{transform:translate(var(--walk-x),var(--walk-y))}58%{transform:translate(var(--walk-x),var(--walk-y))}100%{transform:translate(0,0)}}
      @keyframes armType{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(8deg)}}
      @keyframes headBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @keyframes coffeeSip{0%,72%,100%{transform:rotate(0)}82%{transform:rotate(-20deg) translate(-3px,-4px)}}
      @keyframes steam{0%{opacity:0;transform:translateY(4px) scale(.8)}35%{opacity:.7}100%{opacity:0;transform:translateY(-18px) scale(1.15)}}
      @keyframes dataFlow{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}
      @keyframes walkDots{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
      @keyframes notification{0%,75%,100%{opacity:0;transform:translateY(6px)}10%,65%{opacity:1;transform:translateY(0)}}
      .worker-moving{animation:personWalk 7s cubic-bezier(.45,.05,.55,.95) infinite}
      .worker-moving .human-head{animation:headBob .55s ease-in-out infinite}
      .worker-moving .human-arm{animation:armType .45s ease-in-out infinite}
      .coffee-cup{animation:coffeeSip 5s ease-in-out infinite}
      .steam{animation:steam 2.2s ease-in-out infinite}
      .screen-flicker{animation:screenFlicker 1.3s ease-in-out infinite}
      .data-flow{animation:dataFlow 1.8s linear infinite}
      .mission-note{animation:notification 5s ease-in-out infinite}
      .walk-route{stroke-dasharray:7 8;animation:walkDots 2s linear infinite}
    `}</style>

    <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-[#0c141c] px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3"><div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Building2 className="h-6 w-6"/><span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-400"/></div><div><div className="flex items-center gap-2 text-sm font-black text-white">SHAHEEN AI OFFICE <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[8px] text-emerald-300">OPEN</span></div><div className="text-[9px] text-slate-500">Living 2D workplace · Shaheen Academy Jaipur</div></div></div>
      <div className="flex items-center gap-3 text-[9px] text-slate-500"><span>👥 {enabled.length} employees</span><span>•</span><span>📦 {completed} completed</span><button onClick={reset} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-400 hover:text-white"><RotateCcw className="mr-1 inline h-3 w-3"/>Reset Office</button></div>
    </header>

    <section className="overflow-hidden rounded-[26px] border border-slate-600 bg-[#111a23] shadow-[0_30px_100px_rgba(0,0,0,.5)]">
      <div className="flex items-center justify-between border-b border-slate-700 bg-[#17232e] px-5 py-3"><div><div className="text-[11px] font-black uppercase tracking-[.24em] text-white">🏢 SHAHEEN AI OFFICE · 2D LIVE FLOOR</div><div className="mt-1 text-[9px] text-slate-500">A real-time office scene — people, desks, screens, hallways and missions react to your commands.</div></div><div className={`rounded-full border px-3 py-1 text-[9px] font-bold ${activeTask?'border-amber-300/30 bg-amber-300/10 text-amber-200':'border-emerald-300/20 bg-emerald-300/10 text-emerald-300'}`}>● {activeTask?'MISSION ACTIVE':'OFFICE OPEN'}</div></div>

      <div className="relative h-[760px] overflow-hidden bg-[#202b34]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}}>
        {/* office walls / zones */}
        <div className="absolute inset-5 rounded-[24px] border-4 border-[#354654] bg-[#26333e] shadow-inner"/>
        <div className="absolute left-[5%] right-[5%] top-[11%] h-[2px] bg-[#435462]"/>
        <div className="absolute left-[5%] right-[5%] top-[48%] h-[2px] bg-[#435462]"/>
        <div className="absolute left-[5%] top-[11%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[25%] top-[11%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[45%] top-[11%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[65%] top-[11%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[85%] top-[11%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[5%] top-[48%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[35%] top-[48%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[55%] top-[48%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[75%] top-[48%] h-[37%] w-[2px] bg-[#435462]"/>
        <div className="absolute left-[95%] top-[48%] h-[37%] w-[2px] bg-[#435462]"/>

        {/* manager office */}
        <div className={`absolute left-1/2 top-[3%] z-20 h-[115px] w-[210px] -translate-x-1/2 rounded-xl border-2 ${activeTask?'border-cyan-300/60 shadow-[0_0_40px_rgba(34,211,238,.18)]':'border-slate-500'} bg-[#10202a]`}>
          <div className="absolute inset-x-3 top-2 text-center text-[7px] font-black tracking-[.3em] text-slate-500">MANAGER / JARVIS ROOM</div>
          <div className={`absolute left-1/2 top-7 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-2 ${activeTask?'animate-pulse border-cyan-300':'border-cyan-300/30'} bg-[#08151d] text-3xl`}>🤖</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-cyan-200">JARVIS</div>
          {activeTask&&<div className="mission-note absolute -bottom-9 left-1/2 z-30 w-48 -translate-x-1/2 rounded-lg border border-cyan-300/20 bg-[#08131b] px-2 py-1 text-center text-[8px] text-cyan-200 shadow-xl">Assigning mission to {enabled[worker]?.name||'specialist'}…</div>}
        </div>

        {/* hall / walking lane */}
        <div className="absolute left-[6%] right-[6%] top-[40%] h-[78px] rounded-xl border-y-2 border-slate-500/50 bg-[#1a252e] shadow-inner"><div className="absolute inset-y-0 left-1/2 w-px bg-slate-600/50"/><div className="absolute left-4 top-1/2 -translate-y-1/2 text-[7px] font-black tracking-[.35em] text-slate-600">JARVIS HALL · EMPLOYEE FLOOR</div></div>

        {/* desks and people */}
        {enabled.map((a,i)=>{
          const pos=deskPos[i];
          const working=worker===i && !!activeTask;
          const coffee=!activeTask && i===Math.min(4,enabled.length-1);
          const xTravel=i<4 ? `${(50-(i*13)) * 0.9}%` : `${(50-(i-4)*10) * 0.75}%`;
          const yTravel=i<4 ? '-250%' : '-165%';
          return <div key={a.id} className="absolute z-10 h-[190px] w-[18%] min-w-[170px] -translate-x-1/2" style={{left:pos.x,top:pos.y}}>
            <div className="absolute inset-0 rounded-lg border border-slate-600/70 bg-[#1c2935]/90 shadow-[inset_0_0_30px_rgba(0,0,0,.2)]"/>
            <div className="absolute left-2 top-2 max-w-[80%] truncate text-[7px] font-black tracking-wider text-slate-500">{roomNames[i]}</div>
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400"/>
            {/* desk */}
            <div className="absolute bottom-8 left-1/2 h-14 w-[82%] -translate-x-1/2 rounded-lg border border-[#6b5544] bg-[#584333] shadow-[0_7px_0_#30251f]">
              <div className={`screen-flicker absolute left-1/2 top-[-43px] h-12 w-20 -translate-x-1/2 rounded-md border-4 border-[#364553] bg-[#07131a] shadow-lg`}>
                <div className="m-1.5 h-1 rounded bg-cyan-300/40"/><div className="mx-1.5 mt-1 h-1 rounded bg-cyan-300/20"/><div className="mx-1.5 mt-1 h-1 w-2/3 rounded bg-emerald-300/25"/>
                {working&&<div className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded bg-black/70"><div className="data-flow h-full w-1/3 bg-cyan-300"/></div>}
              </div>
              <div className="absolute left-1/2 top-1 h-6 w-11 -translate-x-1/2 rounded bg-[#22272b]"/>
              <div className="absolute left-1/2 bottom-[-7px] h-2 w-16 -translate-x-1/2 rounded bg-slate-600"/>
              <div className="absolute right-3 top-3 h-4 w-5 rounded border border-slate-500/50 bg-[#d8c4a4]/20"/>
            </div>
            {/* physical character */}
            <button onClick={()=>setSelectedAgentId(a.id)} className={`absolute left-1/2 bottom-[45px] z-20 -translate-x-1/2 ${working?'worker-moving':''}`} style={{['--walk-x' as any]:xTravel,['--walk-y' as any]:yTravel}}>
              <div className="relative h-14 w-12">
                <div className="human-head absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-[#d5a889] bg-[#e5b594] shadow-md"/>
                <div className="absolute left-1/2 top-6 h-8 w-9 -translate-x-1/2 rounded-t-xl rounded-b-md border border-slate-700 bg-gradient-to-b from-cyan-400/70 to-slate-700"/>
                <div className="human-arm absolute left-0 top-7 h-2 w-5 origin-right rotate-6 rounded-full bg-[#d9aa8b]"/>
                <div className="human-arm absolute right-0 top-7 h-2 w-5 origin-left -rotate-6 rounded-full bg-[#d9aa8b]"/>
                <div className="absolute bottom-[-4px] left-1/2 h-3 w-8 -translate-x-1/2 border-l-2 border-r-2 border-slate-900"/>
                {working&&<span className="absolute -right-12 top-0 rounded-full border border-amber-300/30 bg-[#16150e] px-1.5 py-0.5 text-[7px] font-black text-amber-200">WORK</span>}
                {coffee&&<span className="coffee-cup absolute -right-6 top-5 text-base">☕</span>}
              </div>
            </button>
            {coffee&&<><div className="steam absolute bottom-[82px] right-[22%] text-sm">♨</div><div className="absolute bottom-2 left-3 text-[7px] text-amber-200/60">COFFEE BREAK</div></>}
            {working&&<div className="absolute bottom-2 left-3 text-[7px] font-bold text-amber-200">● WORKING · mission active</div>}
            {!working&&!coffee&&<div className="absolute bottom-2 left-3 text-[7px] text-slate-600">● AT WORKSTATION</div>}
          </div>;
        })}

        {/* physical office objects */}
        <div className="absolute bottom-[8%] left-[7%] h-[95px] w-[22%] rounded-xl border-2 border-slate-600 bg-[#17232c] p-3"><div className="text-[8px] font-black tracking-widest text-slate-500">RECEPTION</div><div className="mt-5 flex items-end gap-2"><div className="h-10 w-20 rounded bg-[#594838]"/><div className="h-16 w-3 rounded bg-slate-600"/><div className="h-7 w-7 rounded-full bg-[#b9896c]"/></div></div>
        <div className="absolute bottom-[8%] left-1/2 h-[95px] w-[25%] -translate-x-1/2 rounded-xl border-2 border-slate-600 bg-[#17232c] p-3"><div className="text-[8px] font-black tracking-widest text-slate-500">BREAK AREA</div><div className="absolute bottom-4 left-1/2 h-9 w-24 -translate-x-1/2 rounded-full border border-[#6b5544] bg-[#4d3b2e]"/><div className="absolute bottom-6 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[#d2c0a2]"/></div>
        <div className="absolute bottom-[8%] right-[7%] h-[95px] w-[22%] rounded-xl border-2 border-amber-300/20 bg-[#211d18] p-3"><div className="text-[8px] font-black tracking-widest text-amber-200/60">BOSS / CEO DESK</div><div className="absolute bottom-3 left-5 h-10 w-28 rounded bg-[#634a35]"/><div className="absolute bottom-7 right-6 h-10 w-10 rounded-full bg-[#d9aa8b]"/><div className="absolute bottom-5 right-8 h-8 w-7 rounded-t-xl bg-slate-700"/></div>

        {/* animated mission route */}
        {activeTask&&<svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" viewBox="0 0 1000 760" preserveAspectRatio="none"><path className="walk-route" d={`M ${100+(Math.max(0,worker)*100)} 330 C 350 300 500 300 500 130`} fill="none" stroke="rgba(34,211,238,.45)" strokeWidth="2"/></svg>}

        <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-slate-600 bg-[#0d151d]/95 px-5 py-2 text-[8px] font-bold tracking-[.18em] text-slate-500 shadow-xl">OFFICE FLOOR · LIVE SIMULATION · REAL TASK STATE</div>
      </div>

      {activeTask&&<div className="border-t border-slate-700 bg-[#0b131b] p-3"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-cyan-200"><ClipboardList className="h-3.5 w-3.5"/>Live mission · {activeTask.agentName}</div><div className="mt-2"><TaskPipelineStepper task={activeTask} onRetry={()=>void send(activeTask.userPrompt)}/></div>{activeTask.status==='completed'&&activeTask.result&&<div className="mt-3 border-t border-white/10 pt-3"><ResultViewer task={activeTask} onRepeat={()=>setPrompt(activeTask.userPrompt)}/></div>}</div>}
    </section>

    <section className="mt-3 rounded-2xl border border-slate-700 bg-[#0c141c] p-3 shadow-xl"><div className="flex items-end gap-2"><div className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-[#101923] focus-within:border-cyan-300/40">{files.length>0&&<div className="flex flex-wrap gap-2 px-3 pt-3">{files.map(f=><div key={f.id} className="rounded-lg border border-cyan-400/15 px-2 py-1 text-[9px] text-cyan-200"><FileText className="mr-1 inline h-3 w-3"/>{f.name}<button onClick={()=>setFiles(x=>x.filter(y=>y.id!==f.id))}><X className="ml-1 inline h-3 w-3"/></button></div>)}</div>}<textarea ref={ref} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}}} rows={2} placeholder="Boss, what should the office work on?" className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" disabled={busy}/><div className="flex items-center gap-2 px-3 pb-2"><FileDropzone attachedFiles={files} onAddFiles={x=>setFiles(v=>[...v,...x])} onRemoveFile={id=>setFiles(v=>v.filter(x=>x.id!==id))} disabled={busy}/><VoiceAssistant onSpeechResult={t=>setPrompt(x=>x?`${x} ${t}`:t)} isProcessing={busy}/>{advanced&&<select value={selectedAgentId} onChange={e=>setSelectedAgentId(e.target.value)} className="rounded-lg border border-slate-700 bg-[#111923] px-2 py-1.5 text-[9px] text-slate-400"><option value="auto">JARVIS decides</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}<button onClick={()=>setAdvanced(v=>!v)} className="ml-auto text-[9px] text-slate-600 hover:text-cyan-200">{advanced?'Hide controls':'Controls'}</button></div></div><button onClick={()=>void send()} disabled={busy||(!prompt.trim()&&!files.length)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 disabled:opacity-30"><ArrowUp className="h-5 w-5"/></button></div><div className="mt-2 flex flex-wrap gap-2">{quick.map(([label,text])=><button key={label} onClick={()=>{setPrompt(text);ref.current?.focus();}} className="rounded-full border border-slate-700 bg-white/[.02] px-3 py-1.5 text-[9px] text-slate-400 hover:border-cyan-300/25 hover:text-cyan-200">{label}</button>)}<span className="ml-auto text-[9px] text-slate-600"><MessageSquare className="mr-1 inline h-3 w-3"/>Talk naturally with JARVIS</span></div></section>
  </div>;
};