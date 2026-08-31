import { AgentDefinition, AttachedFile, JarvisMemoryItem, JarvisSettings, TaskRecord, TaskStep } from '../types';

export const DEFAULT_SETTINGS: JarvisSettings = {
  instituteName: 'Shaheen Academy Jaipur', tagline: 'NEET & JEE Excellence', defaultTargetExam: 'NEET', primaryLanguage: 'bilingual',
  aiModel: 'gemini-3.7-flash', voiceAutoSpeak: false, watermarkText: 'SHAHEEN ACADEMY JAIPUR', contactNumber: '+91 98765 43210', theme: 'slate',
};

export class ApiService {
  static async checkHealth() { const res = await fetch('/api/health'); return await res.json(); }
  static async getProviders() { const res = await fetch('/api/providers'); return await res.json(); }
  static async getAgents(): Promise<AgentDefinition[]> { const res = await fetch('/api/agents'); const data = await res.json(); return data.agents || []; }
  static async createAgent(agentData: Partial<AgentDefinition>): Promise<AgentDefinition> { const res = await fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(agentData)}); if(!res.ok){const err=await res.json();throw new Error(err.error||'Failed to create agent');} return (await res.json()).agent; }
  static async updateAgent(id:string,updates:Partial<AgentDefinition>):Promise<AgentDefinition>{const res=await fetch(`/api/agents/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)});return (await res.json()).agent;}
  static async deleteAgent(id:string):Promise<boolean>{return (await (await fetch(`/api/agents/${id}`,{method:'DELETE'})).json()).success;}
  static async getMemories():Promise<JarvisMemoryItem[]>{return (await (await fetch('/api/memory')).json()).memories||[];}
  static async saveMemory(item:Partial<JarvisMemoryItem>):Promise<JarvisMemoryItem>{const res=await fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});return (await res.json()).memory;}
  static async deleteMemory(id:string):Promise<boolean>{return (await (await fetch(`/api/memory/${id}`,{method:'DELETE'})).json()).success;}
  static async clearAllMemory():Promise<boolean>{return (await (await fetch('/api/memory/clear',{method:'POST'})).json()).success;}
  static async checkAgentRoute(prompt:string,attachedFiles?:AttachedFile[],selectedAgentId?:string){return await (await fetch('/api/tasks/route-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,attachedFiles,selectedAgentId})})).json();}

  static async executeTask(params:{userPrompt:string;selectedAgentId?:string;attachedFiles?:AttachedFile[];model?:string;settings?:Partial<JarvisSettings>}):Promise<TaskRecord>{
    try {
      return await this.executeTaskStream(params,(step)=>{ if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent<TaskStep>('jarvis-task-step',{detail:step})); });
    } catch (streamError) {
      const res=await fetch('/api/tasks/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || (streamError instanceof Error ? streamError.message : 'Task execution failed'));
      const task=data.task as TaskRecord;
      for(const step of task.steps||[]) if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent<TaskStep>('jarvis-task-step',{detail:step}));
      return task;
    }
  }

  static async executeTaskStream(params:{userPrompt:string;selectedAgentId?:string;attachedFiles?:AttachedFile[];model?:string;settings?:Partial<JarvisSettings>},onStep:(step:TaskStep)=>void):Promise<TaskRecord>{
    let res:Response;
    try { res=await fetch('/api/tasks/execute-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)}); }
    catch (e) { throw new Error(`Live execution channel unavailable: ${e instanceof Error ? e.message : 'network error'}`); }
    if(!res.ok){let detail='';try{detail=await res.text();}catch{}throw new Error(`Live execution channel returned HTTP ${res.status}${detail ? `: ${detail.slice(0,180)}` : ''}`);}
    if(!res.body)throw new Error('Live execution channel returned no stream.');
    const reader=res.body.getReader();const decoder=new TextDecoder();let buffer='';let finalTask:TaskRecord|null=null;
    const consume=(chunk:string)=>{buffer+=chunk;const events=buffer.split('\n\n');buffer=events.pop()||'';for(const event of events){const line=event.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;try{const payload=JSON.parse(line.slice(6));if(payload.type==='step'&&payload.step)onStep(payload.step);else if(payload.type==='task'&&payload.task)finalTask=payload.task;else if(payload.type==='error')throw new Error(payload.error||'Task execution failed');}catch(err){if(err instanceof Error)throw err;}}};
    while(true){const {value,done}=await reader.read();if(done)break;consume(decoder.decode(value,{stream:true}));}
    consume(decoder.decode());
    if(!finalTask)throw new Error('Live execution channel closed before returning the completed task.');
    return finalTask;
  }
}
