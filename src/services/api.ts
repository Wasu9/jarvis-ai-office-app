import {
  AgentDefinition,
  AttachedFile,
  JarvisMemoryItem,
  JarvisSettings,
  TaskRecord,
  TaskStep,
} from '../types';

export const DEFAULT_SETTINGS: JarvisSettings = {
  instituteName: 'Shaheen Academy Jaipur',
  tagline: 'NEET & JEE Excellence',
  defaultTargetExam: 'NEET',
  primaryLanguage: 'bilingual',
  aiModel: 'gemini-3.7-flash',
  voiceAutoSpeak: false,
  watermarkText: 'SHAHEEN ACADEMY JAIPUR',
  contactNumber: '+91 98765 43210',
  theme: 'slate',
};

export class ApiService {
  static async checkHealth() { const res = await fetch('/api/health'); return await res.json(); }
  static async getProviders() { const res = await fetch('/api/providers'); return await res.json(); }
  static async getAgents(): Promise<AgentDefinition[]> { const res = await fetch('/api/agents'); const data = await res.json(); return data.agents || []; }
  static async createAgent(agentData: Partial<AgentDefinition>): Promise<AgentDefinition> { const res = await fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(agentData)}); if(!res.ok){const err=await res.json();throw new Error(err.error||'Failed to create agent');} const data=await res.json(); return data.agent; }
  static async updateAgent(id:string,updates:Partial<AgentDefinition>):Promise<AgentDefinition>{const res=await fetch(`/api/agents/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)});const data=await res.json();return data.agent;}
  static async deleteAgent(id:string):Promise<boolean>{const res=await fetch(`/api/agents/${id}`,{method:'DELETE'});const data=await res.json();return data.success;}
  static async getMemories():Promise<JarvisMemoryItem[]>{const res=await fetch('/api/memory');const data=await res.json();return data.memories||[];}
  static async saveMemory(item:Partial<JarvisMemoryItem>):Promise<JarvisMemoryItem>{const res=await fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});const data=await res.json();return data.memory;}
  static async deleteMemory(id:string):Promise<boolean>{const res=await fetch(`/api/memory/${id}`,{method:'DELETE'});const data=await res.json();return data.success;}
  static async clearAllMemory():Promise<boolean>{const res=await fetch('/api/memory/clear',{method:'POST'});const data=await res.json();return data.success;}
  static async checkAgentRoute(prompt:string,attachedFiles?:AttachedFile[],selectedAgentId?:string){const res=await fetch('/api/tasks/route-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,attachedFiles,selectedAgentId})});return await res.json();}
  static async executeTask(params:{userPrompt:string;selectedAgentId?:string;attachedFiles?:AttachedFile[];model?:string;settings?:Partial<JarvisSettings>}):Promise<TaskRecord>{const res=await fetch('/api/tasks/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});const data=await res.json();if(!res.ok)throw new Error(data.error||data.task?.error||'Failed to execute task');return data.task;}

  static async executeTaskStream(
    params:{userPrompt:string;selectedAgentId?:string;attachedFiles?:AttachedFile[];model?:string;settings?:Partial<JarvisSettings>},
    onStep:(step:TaskStep)=>void,
  ):Promise<TaskRecord>{
    const res=await fetch('/api/tasks/execute-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});
    if(!res.ok){let message='Failed to start streamed task';try{const data=await res.json();message=data.error||message;}catch{}throw new Error(message);}
    if(!res.body)throw new Error('Streaming is not supported by this browser.');
    const reader=res.body.getReader();const decoder=new TextDecoder();let buffer='';let finalTask:TaskRecord|null=null;
    const consume=(chunk:string)=>{buffer+=chunk;const events=buffer.split('\n\n');buffer=events.pop()||'';for(const event of events){const line=event.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;const raw=line.slice(6);if(raw==='[DONE]')continue;try{const payload=JSON.parse(raw);if(payload.type==='step'&&payload.step)onStep(payload.step);if(payload.type==='task'&&payload.task)finalTask=payload.task;if(payload.type==='error')throw new Error(payload.error||'Task execution failed');}catch(err){if(err instanceof Error&&err.message!=='Unexpected end of JSON input')throw err;}}};
    while(true){const {value,done}=await reader.read();if(done)break;consume(decoder.decode(value,{stream:true}));}
    consume(decoder.decode());
    if(!finalTask)throw new Error('JARVIS stream ended before returning the completed task.');
    return finalTask;
  }
}
