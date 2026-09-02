import { AgentDefinition, AttachedFile, JarvisMemoryItem, JarvisSettings, TaskRecord, TaskStep } from '../types';

export const DEFAULT_SETTINGS: JarvisSettings = { instituteName:'Shaheen Academy Jaipur',tagline:'NEET & JEE Excellence',defaultTargetExam:'NEET',primaryLanguage:'bilingual',aiModel:'gemini-3.7-flash',voiceAutoSpeak:false,watermarkText:'SHAHEEN ACADEMY JAIPUR',contactNumber:'+91 98765 43210',theme:'slate' };
const PRODUCTION_WORDS=['paper','question paper','test paper','exam paper','dpp','daily practice','pdf','word','docx','bilingual','translate','poster','notice','circular','reel','video script','social media','instagram','facebook','youtube','admission post','mock test','worksheet','answer key','options a','options b','generate document','create document'];
const GREETINGS=/^(hi|hii|hello|hey|hey jarvis|hi jarvis|hello jarvis|good morning|good afternoon|good evening|how are you|how r u)[!.?\s]*$/i;
function isConversational(prompt:string,selectedAgentId?:string,attachedFiles?:AttachedFile[]){if(selectedAgentId&&selectedAgentId!=='auto')return false;if(attachedFiles?.length)return false;const lower=prompt.trim().toLowerCase();if(GREETINGS.test(lower))return true;return !PRODUCTION_WORDS.some(word=>lower.includes(word));}
function instantReply(prompt:string):string|null{if(!GREETINGS.test(prompt.trim()))return null;const p=prompt.trim().toLowerCase();if(p.includes('how are you')||p.includes('how r u'))return 'Bilkul ready hoon 😎 Systems online hain. Batao, kya karna hai?';if(p.includes('good morning'))return 'Good morning! ⚡ JARVIS online hai. Batao aaj kya mission hai?';if(p.includes('good afternoon'))return 'Good afternoon! ⚡ JARVIS ready hai. Batao kya kaam shuru karein?';if(p.includes('good evening'))return 'Good evening! ⚡ JARVIS ready hai. Kya kaam shuru karein?';return 'Hii! 👋 JARVIS online hai. Batao kya karna hai?';}

type ChatHistory = Array<{role:'user'|'assistant';content:string}>;
type TaskRequest = {userPrompt:string;selectedAgentId?:string;attachedFiles?:AttachedFile[];model?:string;settings?:Partial<JarvisSettings>;history?:ChatHistory;resumeFrom?:number;resumeQuestions?:any[]};
function requestedQuestionCount(prompt:string):number|null{const m=prompt.match(/\b(\d{1,3})\s*(?:questions?|qs?|प्रश्न)\b/i);return m?Number(m[1]):null;}
function promptWithQuestionCount(prompt:string,count:number){const re=/\b\d{1,3}\s*(?:questions?|qs?|प्रश्न)\b/i;return re.test(prompt)?prompt.replace(re,`${count} questions`):`${prompt} Process exactly ${count} questions from the attached source.`;}
function rawQuestionsFromTask(task:TaskRecord):any[]{try{const parsed=JSON.parse(String(task.result?.rawText||''));return Array.isArray(parsed.questions)?parsed.questions:[];}catch{return[];}}
function dispatchLiveStep(step:TaskStep){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<TaskStep>('jarvis-task-step',{detail:step}));}

export class ApiService{
  static async checkHealth(){return await (await fetch('/api/health')).json();}
  static async getProviders(){return await (await fetch('/api/providers')).json();}
  static async getAgents():Promise<AgentDefinition[]>{return (await (await fetch('/api/agents')).json()).agents||[];}
  static async createAgent(agentData:Partial<AgentDefinition>):Promise<AgentDefinition>{const res=await fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(agentData)});if(!res.ok){const err=await res.json();throw new Error(err.error||'Failed to create agent');}return(await res.json()).agent;}
  static async updateAgent(id:string,updates:Partial<AgentDefinition>):Promise<AgentDefinition>{return(await(await fetch(`/api/agents/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)})).json()).agent;}
  static async deleteAgent(id:string):Promise<boolean>{return(await(await fetch(`/api/agents/${id}`,{method:'DELETE'})).json()).success;}
  static async getMemories():Promise<JarvisMemoryItem[]>{return(await(await fetch('/api/memory')).json()).memories||[];}
  static async saveMemory(item:Partial<JarvisMemoryItem>):Promise<JarvisMemoryItem>{const res=await fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});return(await res.json()).memory;}
  static async deleteMemory(id:string):Promise<boolean>{return(await(await fetch(`/api/memory/${id}`,{method:'DELETE'})).json()).success;}
  static async clearAllMemory():Promise<boolean>{return(await(await fetch('/api/memory/clear',{method:'POST'})).json()).success;}
  static async checkAgentRoute(prompt:string,attachedFiles?:AttachedFile[],selectedAgentId?:string){if(isConversational(prompt,selectedAgentId,attachedFiles))return{routedAgentId:'conversational-core',agent:{id:'conversational-core',name:'JARVIS Conversational Core',description:'Fast general-purpose assistant',enabled:true}};return await(await fetch('/api/tasks/route-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,attachedFiles,selectedAgentId})})).json();}
  static async executeTask(params:TaskRequest):Promise<TaskRecord>{
    if(isConversational(params.userPrompt,params.selectedAgentId,params.attachedFiles)){
      const started=Date.now();const instant=instantReply(params.userPrompt);let reply=instant||'';
      if(!reply){const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:params.userPrompt,model:params.model||'gemini-3.7-flash',history:params.history||[]})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Conversational response failed');reply=String(data.reply||'');}
      const now=new Date();const steps:TaskStep[]=[{status:'waiting',label:'JARVIS Conversational Core ready',timestamp:new Date(started).toISOString()},{status:'generating',label:instant?'Instant response':'Response generated with conversation context',timestamp:now.toISOString()}];return{id:`chat-${started}`,title:params.userPrompt.slice(0,70)||'Conversation',userPrompt:params.userPrompt,agentId:'conversational-core',agentName:'JARVIS Conversational Core',status:'completed',createdAt:new Date(started).toISOString(),completedAt:now.toISOString(),steps,attachedFiles:[],result:{summary:'Conversational response',rawText:reply,structuredData:null,artifacts:[],agentUsed:{id:'conversational-core',name:'JARVIS Conversational Core'},metrics:{durationMs:Date.now()-started}} as any};
    }
    const detectedTotal=requestedQuestionCount(params.userPrompt);const total=detectedTotal||180;const isSourceDocument=!!params.attachedFiles?.length&&/bilingual|translate|translation|convert|extract|read|exact|same|faithful|preserve|hindi|अनुवाद|बाइलिंगुअल|जैसा है|सिर्फ|word format|docx/i.test(params.userPrompt);
    if(isSourceDocument&&total>20)return this.executeLargeSourceTask(params,total);
    return this.executeTaskStream(params,step=>dispatchLiveStep(step));
  }
  static async executeLargeSourceTask(params:TaskRequest,total:number):Promise<TaskRecord>{
    const started=Date.now();const chunkSize=20;const startFrom=Math.min(total,Math.max(1,Number(params.resumeFrom||1)));let completed=Math.max(0,startFrom-1);let resumeQuestions=Array.isArray(params.resumeQuestions)?[...params.resumeQuestions]:[];let lastTask:TaskRecord|null=null;const allSteps:TaskStep[]=[];
    dispatchLiveStep({status:'generating',label:`SOURCE PLAN · ${total} questions · chunked execution`,timestamp:new Date().toISOString(),details:`Each source range runs in its own request so no single Vercel function can time out the full mission.`});
    for(let start=startFrom;start<=total;start+=chunkSize){
      const end=Math.min(start+chunkSize-1,total);const chunkPrompt=promptWithQuestionCount(params.userPrompt,end);dispatchLiveStep({status:'generating',label:`SOURCE CHUNK · Q.${start}–Q.${end}`,timestamp:new Date().toISOString(),details:`Overall mission: ${completed}/${total} captured. Processing this range independently.`});
      try{
        const task=await this.executeTaskStream({...params,userPrompt:chunkPrompt,resumeFrom:start>1?start:undefined,resumeQuestions:start>1?resumeQuestions:undefined},step=>{allSteps.push(step);dispatchLiveStep(step);});
        lastTask=task;resumeQuestions=rawQuestionsFromTask(task);completed=resumeQuestions.length;
        dispatchLiveStep({status:'checking',label:`SOURCE CHECKPOINT · ${completed}/${total}`,timestamp:new Date().toISOString(),details:`Checkpoint confirmed. Next range starts at Q.${completed+1}.`});
      }catch(e:any){
        const message=e?.message||'Source chunk execution failed.';const checkpoint={completedQuestions:completed,totalQuestions:total,nextQuestion:Math.min(total,completed+1),questions:resumeQuestions};
        const base=lastTask||({id:`task-${started}`,title:params.userPrompt.slice(0,70),userPrompt:params.userPrompt,agentId:'pdf-bilingual',agentName:'PDF Bilingual Specialist',status:'failed',createdAt:new Date(started).toISOString(),steps:allSteps,attachedFiles:params.attachedFiles||[],error:message} as TaskRecord);
        return {...base,status:'failed',createdAt:new Date(started).toISOString(),completedAt:new Date().toISOString(),steps:allSteps,attachedFiles:params.attachedFiles||[],error:`Source extraction paused after Q.${completed}. ${message}`,checkpoint};
      }
    }
    if(!lastTask)throw new Error('No source extraction request was completed.');
    const finalSteps=[...allSteps,{status:'completed' as TaskStep['status'],label:'SOURCE MISSION · 100% complete',timestamp:new Date().toISOString(),details:`All ${total} source questions captured and the final Word document was generated.`}];
    return {...lastTask,createdAt:new Date(started).toISOString(),completedAt:new Date().toISOString(),steps:finalSteps,result:lastTask.result?{...lastTask.result,metrics:{...(lastTask.result.metrics||{}),durationMs:Date.now()-started}}:lastTask.result};
  }
  static async executeTaskStream(params:TaskRequest,onStep:(step:TaskStep)=>void):Promise<TaskRecord>{let res:Response;try{res=await fetch('/api/tasks/execute-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});}catch(e){throw new Error(`Live execution channel unavailable: ${e instanceof Error?e.message:'network error'}`);}if(!res.ok){let detail='';try{detail=await res.text();}catch{}throw new Error(`Live execution channel returned HTTP ${res.status}${detail?`: ${detail.slice(0,180)}`:''}`);}if(!res.body)throw new Error('Live execution channel returned no stream.');const reader=res.body.getReader();const decoder=new TextDecoder();let buffer='';let finalTask:TaskRecord|null=null;const consume=(chunk:string)=>{buffer+=chunk;const events=buffer.split('\n\n');buffer=events.pop()||'';for(const event of events){const line=event.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;try{const payload=JSON.parse(line.slice(6));if(payload.type==='step'&&payload.step)onStep(payload.step);else if(payload.type==='task'&&payload.task)finalTask=payload.task;else if(payload.type==='error')throw new Error(payload.error||'Task execution failed');}catch(err){if(err instanceof Error)throw err;}}};while(true){const{value,done}=await reader.read();if(done)break;consume(decoder.decode(value,{stream:true}));}consume(decoder.decode());if(!finalTask)throw new Error('Live execution channel closed before returning the completed task.');return finalTask;}
}
