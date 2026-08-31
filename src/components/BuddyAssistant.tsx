import React, { useRef, useState } from 'react';
import { ArrowUp, Bot, FileText, Mic, Paperclip, Plus, RotateCcw, Sparkles, Wrench, X } from 'lucide-react';
import { AgentDefinition, AttachedFile, JarvisSettings, TaskRecord, TaskStep } from '../types';
import { FileDropzone } from './FileDropzone';
import { VoiceAssistant } from './VoiceAssistant';
import { TaskPipelineStepper } from './TaskPipelineStepper';
import { ResultViewer } from './ResultViewer';
import { ApiService } from '../services/api';

interface BuddyAssistantProps {
  agents: AgentDefinition[];
  selectedAgentId: string;
  setSelectedAgentId: (id:string)=>void;
  settings: JarvisSettings;
  activeTask: TaskRecord|null;
  setActiveTask: (task:TaskRecord|null)=>void;
  onTaskCompleted: (task:TaskRecord)=>void;
  recentTasks: TaskRecord[];
  onOpenQuickBuilder: ()=>void;
}

type ChatMessage = { id:string; role:'user'|'assistant'; content:string; time:number };

const quickActions = [
  {label:'Create a NEET paper', text:'Create a NEET Physics paper with bilingual English-Hindi questions and options.'},
  {label:'Read a PDF', text:'Read the attached PDF and convert it into a clean bilingual Word document.'},
  {label:'Make a DPP', text:'Create a NEET DPP with questions, answer key and detailed solutions.'},
  {label:'Make a notice', text:'Create a professional Shaheen Academy Jaipur notice for an upcoming mock test.'},
];

const initialAssistant = 'Hey! 👋 Main JARVIS hoon. Batao, aaj kya karna hai?';

export const BuddyAssistant: React.FC<BuddyAssistantProps> = ({agents,selectedAgentId,setSelectedAgentId,settings,activeTask,setActiveTask,onTaskCompleted,recentTasks,onOpenQuickBuilder}) => {
  const [messages,setMessages]=useState<ChatMessage[]>([{id:'welcome',role:'assistant',content:initialAssistant,time:Date.now()}]);
  const [prompt,setPrompt]=useState('');
  const [attachedFiles,setAttachedFiles]=useState<AttachedFile[]>([]);
  const [busy,setBusy]=useState(false);
  const [advanced,setAdvanced]=useState(false);
  const textareaRef=useRef<HTMLTextAreaElement>(null);

  const reset=()=>{setMessages([{id:`welcome-${Date.now()}`,role:'assistant',content:'Fresh workspace ready. What are we working on?',time:Date.now()}]);setPrompt('');setAttachedFiles([]);setActiveTask(null);setBusy(false);};

  const addUser=(content:string)=>setMessages(p=>[...p,{id:`u-${Date.now()}`,role:'user',content,time:Date.now()}]);
  const addAssistant=(content:string)=>setMessages(p=>[...p,{id:`a-${Date.now()}`,role:'assistant',content,time:Date.now()}]);

  const send=async(custom?:string)=>{
    const text=(custom??prompt).trim();
    if(!text&&!attachedFiles.length) return;
    const history=messages.slice(-10).map(m=>({role:m.role,content:m.content}));
    const userText=text || 'Process the attached file.';
    addUser(userText);setPrompt('');setBusy(true);
    const placeholder:TaskRecord={id:`pending-${Date.now()}`,title:userText.slice(0,70),userPrompt:userText,agentId:selectedAgentId==='auto'?'jarvis':'selected',agentName:'JARVIS',status:'understanding',createdAt:new Date().toISOString(),steps:[{status:'understanding',label:'JARVIS is understanding your request',timestamp:new Date().toISOString()}],attachedFiles:[...attachedFiles]};
    setActiveTask(placeholder);
    try{
      const task=await ApiService.executeTask({userPrompt:userText,selectedAgentId,attachedFiles,model:settings.aiModel,settings,history});
      setActiveTask(task);
      if(task.agentId==='conversational-core'){
        addAssistant(task.result?.rawText||'I am ready.');
        setActiveTask(null);
      } else {
        onTaskCompleted(task);
      }
      setAttachedFiles([]);
    }catch(err:any){
      setActiveTask({...placeholder,status:'failed',error:err.message||'Something went wrong',completedAt:new Date().toISOString()});
    }finally{setBusy(false);}
  };

  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}};

  return <div className="mx-auto w-full max-w-4xl">
    <div className="mb-8 flex items-center justify-between px-1">
      <div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Bot className="h-5 w-5"/><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]"/></div><div><div className="text-sm font-semibold tracking-wide text-white">JARVIS</div><div className="text-[11px] text-slate-500">Shaheen Academy Jaipur · Online</div></div></div>
      <div className="flex items-center gap-2"><button onClick={reset} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-200"><RotateCcw className="h-3.5 w-3.5"/>New task</button><button onClick={()=>setAdvanced(v=>!v)} className={`rounded-xl border px-3 py-2 text-[11px] transition ${advanced?'border-cyan-400/30 bg-cyan-400/10 text-cyan-200':'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'}`}><Wrench className="mr-1.5 inline h-3.5 w-3.5"/>Advanced</button></div>
    </div>

    {messages.length===1 ? <div className="pb-10 pt-12 text-center sm:pt-20"><div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-transparent text-cyan-200 shadow-[0_0_45px_rgba(34,211,238,.12)]"><Sparkles className="h-8 w-8"/></div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">What are we working on?</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Ask naturally. JARVIS can chat, research, read PDFs, build papers, create documents and coordinate your specialist agents.</p></div> : <div className="mb-6 space-y-5">{messages.map(m=><div key={m.id} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 ${m.role==='user'?'bg-cyan-400 text-slate-950':'border border-white/10 bg-white/[0.035] text-slate-200'}`}><div className="whitespace-pre-wrap">{m.content}</div></div></div>)}</div>}

    {activeTask && <div className="mb-5"><TaskPipelineStepper task={activeTask} onRetry={()=>void send(activeTask.userPrompt)}/>{activeTask.status==='completed'&&activeTask.result&&<div className="mt-4"><ResultViewer task={activeTask} onRepeat={()=>setPrompt(activeTask.userPrompt)}/></div>}</div>}

    <div className="rounded-[26px] border border-white/10 bg-[#090f18]/90 p-2 shadow-[0_18px_70px_rgba(0,0,0,.35)] backdrop-blur-xl">
      {attachedFiles.length>0&&<div className="flex flex-wrap gap-2 px-3 pt-2">{attachedFiles.map(f=><div key={f.id} className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-2.5 py-1.5 text-[10px] text-cyan-200"><FileText className="h-3.5 w-3.5"/>{f.name}<button onClick={()=>setAttachedFiles(p=>p.filter(x=>x.id!==f.id))}><X className="h-3 w-3"/></button></div>)}</div>}
      <textarea ref={textareaRef} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={handleKeyDown} rows={3} placeholder="Ask JARVIS anything…" className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600" disabled={busy}/>
      <div className="flex items-center justify-between gap-2 px-2 pb-1"><div className="flex items-center gap-1.5"><FileDropzone attachedFiles={attachedFiles} onAddFiles={files=>setAttachedFiles(p=>[...p,...files])} onRemoveFile={id=>setAttachedFiles(p=>p.filter(f=>f.id!==id))} disabled={busy}/><VoiceAssistant onSpeechResult={t=>setPrompt(p=>p?`${p} ${t}`:t)} isProcessing={busy}/>{advanced&&<select value={selectedAgentId} onChange={e=>setSelectedAgentId(e.target.value)} className="ml-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-[10px] text-slate-400 outline-none"><option value="auto">Auto</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}</div><button onClick={()=>void send()} disabled={busy||(!prompt.trim()&&!attachedFiles.length)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,.25)] transition hover:bg-cyan-300 disabled:opacity-30"><ArrowUp className="h-5 w-5"/></button></div>
    </div>

    {messages.length===1&&!activeTask&&<div className="mt-5 flex flex-wrap justify-center gap-2">{quickActions.map(a=><button key={a.label} onClick={()=>{setPrompt(a.text);textareaRef.current?.focus();}} className="rounded-full border border-white/10 bg-white/[0.025] px-3.5 py-2 text-[11px] text-slate-400 transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.05] hover:text-cyan-200">{a.label}</button>)}</div>}

    {recentTasks.length>0&&!activeTask&&messages.length>1&&<button onClick={()=>setActiveTask(recentTasks[0])} className="mx-auto mt-5 flex items-center gap-2 text-[11px] text-slate-600 hover:text-cyan-300"><Plus className="h-3 w-3"/>Open latest work</button>}
  </div>;
};
