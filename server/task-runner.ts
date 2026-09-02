import { aiRegistry } from './ai/provider.js';
import { agentRegistry } from './agents/definitions.js';
import { memoryStore } from './memory.js';
import { generateDocxBuffer, DocxPaperData } from './docx-generator.js';
import { AttachedFile, ExecutionResult, GeneratedArtifact, TaskRecord, TaskStep, TaskStatus } from '../src/types/index.js';
import { saveTask } from './persistence.js';
import { validateExecutionResult, validateTaskRecord } from './core-qa.js';

export interface ExecuteTaskParams { userPrompt:string; selectedAgentId?:string; attachedFiles?:AttachedFile[]; model?:string; settings?:{instituteName?:string;targetExam?:string;defaultTargetExam?:string;primaryLanguage?:string;aiModel?:string}; onStep?:(step:TaskStep)=>void; }
const PAPER_SCHEMA={type:'OBJECT',properties:{title:{type:'STRING'},instituteName:{type:'STRING'},examType:{type:'STRING'},subject:{type:'STRING'},duration:{type:'STRING'},totalMarks:{type:'STRING'},instructions:{type:'ARRAY',items:{type:'STRING'}},questions:{type:'ARRAY',items:{type:'OBJECT',properties:{number:{type:'STRING'},textEn:{type:'STRING'},textHi:{type:'STRING'},options:{type:'ARRAY',items:{type:'OBJECT',properties:{en:{type:'STRING'},hi:{type:'STRING'}},required:['en','hi']}},correctOption:{type:'STRING'},solution:{type:'STRING'},diagramSvg:{type:'STRING'}},required:['number','textEn','textHi','options']}}},required:['title','questions']};
function isPaperAgent(id:string){return id==='neet-jee-paper'||id==='dpp-generator'||id==='pdf-bilingual';}
function sourceConversion(prompt:string,files?:AttachedFile[]){const p=prompt.toLowerCase();const hasDocument=!!files?.length;return hasDocument&&/bilingual|translate|translation|convert|extract|read|exact|same|faithful|preserve|hindi|अनुवाद|बाइलिंगुअल|जैसा है|सिर्फ|word format|docx/.test(p);}
function wantsKey(prompt:string){return /answer\s*key|उत्तर\s*कुंजी/i.test(prompt);}
function wantsSolutions(prompt:string){return /solution|solutions|step[- ]by[- ]step|विस्तृत हल|हल सहित/i.test(prompt);}
function extractJson(text:string):any{const cleaned=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(cleaned);}catch{}const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(cleaned.slice(a,b+1));}catch{}}throw new Error('JARVIS received invalid structured data and stopped before creating the Word file.');}
function countRequested(prompt:string):number|null{const m=prompt.match(/\b(\d{1,3})\s*(?:questions?|qs?|प्रश्न)\b/i);return m?Number(m[1]):null;}
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
type PaperQuestion=NonNullable<DocxPaperData['questions']>[number];
function visualLikely(q:PaperQuestion){const t=`${q.textEn||''} ${q.textHi||''}`.toLowerCase();return /(figure|fig\.|graph|plot|diagram|image|shown below|given below|चित्र|आरेख|ग्राफ|नीचे दिया|नीचे दिए)/i.test(t);}
function normalizeOption(n:string){const s=String(n||'').trim().toUpperCase();return ({A:'1',B:'2',C:'3',D:'4'} as Record<string,string>)[s]||s;}
function validate(data:DocxPaperData,prompt:string,sourceLocked:boolean){
 const qs=data.questions||[],expected=countRequested(prompt);if(!qs.length)throw new Error('No questions were produced.');
 if(expected!==null&&qs.length!==expected)throw new Error(`Question count mismatch: requested ${expected}, received ${qs.length}.`);
 const seen=new Set<string>();
 for(const q of qs){
  const n=String(q.number).replace(/^Q\.?(?:Q\.)?/i,'');if(seen.has(n))throw new Error(`Duplicate question Q.${n}.`);seen.add(n);
  if(!q.textEn?.trim()||!q.textHi?.trim())throw new Error(`Q.${n} is missing English or Hindi text.`);
  if(!q.optionsEn||q.optionsEn.length!==4||!q.optionsHi||q.optionsHi.length!==4)throw new Error(`Q.${n} must contain four English and four Hindi options.`);
  for(let i=0;i<4;i++)if(!q.optionsEn[i]?.trim()||!q.optionsHi[i]?.trim())throw new Error(`Q.${n} option ${i+1} is missing a language value.`);
  if(!sourceLocked&&(wantsKey(prompt)||wantsSolutions(prompt))&&!/^[1-4]$/.test(normalizeOption(String(q.correctOption||''))))throw new Error(`Q.${n} has no valid numeric answer key.`);
  if(sourceLocked&&visualLikely(q)&&!q.diagramSvg?.trim())throw new Error(`Q.${n} contains a source visual reference but no diagram was captured.`);
 }
}

export class TaskRunner{
 static routeAgent(prompt:string,files?:AttachedFile[],manual?:string):string{
  if(manual&&manual!=='auto'){const a=agentRegistry.getAgent(manual);if(a?.enabled)return a.id;}
  const lower=prompt.toLowerCase();
  if(sourceConversion(prompt,files))return 'pdf-bilingual';
  const hasPdf=files?.some(f=>f.type.includes('pdf')||f.name.toLowerCase().endsWith('.pdf'));
  if(['notice','poster','circular','ptm','holiday','vacation','announcement','seminar'].some(k=>lower.includes(k)))return'poster-notice';
  if(['reel','short','video script','shot list','voiceover','60 second','30 second','video concept'].some(k=>lower.includes(k)))return'reel-content';
  if(['instagram','facebook','youtube community','caption','hashtag','carousel','social media','admission open','promo post'].some(k=>lower.includes(k)))return'social-media';
  if(['dpp','daily practice','practice problem','homework sheet','practice sheet'].some(k=>lower.includes(k)))return'dpp-generator';
  if(hasPdf||lower.includes('pdf')||(lower.includes('read')&&!!files?.length))return'pdf-bilingual';
  if(['neet','jee','question paper','test paper','exam paper','questions','physics','chemistry','biology','botany','zoology','maths','mathematics'].some(k=>lower.includes(k)))return'neet-jee-paper';
  const custom=agentRegistry.getAllAgents().find(a=>a.isCustom&&a.enabled&&lower.includes(a.name.toLowerCase()));if(custom)return custom.id;
  const words=prompt.trim().replace(/\s+/g,' ').split(' ').slice(0,6).join(' ');const existing=agentRegistry.getAllAgents().find(a=>a.isCustom&&a.enabled&&a.description.toLowerCase().includes(`auto-hired for: ${words.toLowerCase()}`));if(existing)return existing.id;
  return agentRegistry.addCustomAgent({name:`Specialist — ${words.slice(0,42)}`,description:`Auto-hired for: ${words}`,capabilities:['custom'],systemPrompt:`You are a JARVIS specialist created for this request: ${prompt}. Follow exact user requirements, preserve source content, do not invent missing facts, and return production-ready work.`,inputRequirements:['User instructions','Optional documents'],outputTypes:['markdown','docx'],category:'custom',enabled:true,iconName:'Bot',samplePrompts:[prompt]}).id;
 }
 static async execute(params:ExecuteTaskParams):Promise<TaskRecord>{
  const id=`task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,start=Date.now(),steps:TaskStep[]=[];const add=(status:TaskStatus,label:string,details?:string)=>{const s={status,label,timestamp:new Date().toISOString(),details};steps.push(s);try{params.onStep?.(s);}catch{}};
  let agent:any;
  const fail=(message:string)=>{add('failed',message);const task=this.failed(id,start,params,agent,steps,message);try{validateTaskRecord(task);saveTask(task);}catch{}return task;};
  add('waiting','JARVIS command received');const locked=sourceConversion(params.userPrompt,params.attachedFiles);const agentId=this.routeAgent(params.userPrompt,params.attachedFiles,params.selectedAgentId);agent=agentRegistry.getAgent(agentId)||agentRegistry.getAgent('neet-jee-paper')!;
  add('understanding',agent.isCustom?`HR hired ${agent.name}`:`Intent understood · ${agent.name}`,agent.isCustom?'Specialist created for this request.':`Selected Agent ID: ${agent.id}`);add('working',locked?'SOURCE LOCK ACTIVE · uploaded document is authoritative':'Task parameters validated');
  const memory=memoryStore.getMemoryPromptContext(),configuredInstitute=params.settings?.instituteName||'',configuredExam=params.settings?.targetExam||params.settings?.defaultTargetExam||'',structured=isPaperAgent(agent.id);
  const lockRules=locked?`\n\nSOURCE-LOCK MODE — DOCUMENT CONVERSION/READING ONLY:\n- The attached file is the sole source of truth for source-derived content.\n- Copy source header, institute, date, exam/class, subject, instructions, numbering, question text, options, tables, formulas, units, symbols and diagrams faithfully.\n- Do not add, remove, correct, rewrite, summarize, normalize, reorder, merge or improve source content.\n- Do not use JARVIS settings as replacements for source metadata.\n- Do not add answer keys, solutions, explanations, summaries or new headings unless already in the source or explicitly requested.\n- English source text stays unchanged. Translate only into the requested target language.\n- Preserve source errors/ambiguities instead of silently fixing them.\n- Options are stored as four values only; the Word renderer will label them (1), (2), (3), (4). Never prepend A/B/C/D to option text.\n- IMPORTANT: Preserve mathematics as LaTeX inside the text fields. Use \\frac{numerator}{denominator} for fractions, ^{...} for superscripts, _{...} for subscripts, \\sqrt{...} for roots, and LaTeX Greek/symbol commands such as \\alpha, \\beta, \\gamma, \\times, \\pm, \\propto. Never flatten a fraction or equation into plain slash text.\n- If the source contains a diagram, graph, chart, figure or image needed by a question, you MUST populate diagramSvg with a complete standalone valid SVG that reproduces the visible geometry, labels, axes, curves, arrows and important text as closely as possible. Never omit a source visual.\n- If the source question says Figure/Fig./Graph/Plot/Diagram/Shown below/Given below or equivalent Hindi wording, diagramSvg is mandatory.\n- Creative generation is disabled for source-derived content.`:'';
  const system=`${agent.systemPrompt}\n\n${memory}\n\nJARVIS PRODUCTION RULES:\n- Never invent, silently correct, merge, reorder or drop source content.\n- Preserve mathematical notation, units, superscripts, subscripts, Greek letters, fractions and scientific notation.\n- For bilingual output every question and every 1-4 option needs English and Hindi fields.\n- Creative generation is allowed only when the user explicitly asks to create new content.${lockRules}\n${structured?'\nReturn ONLY valid JSON matching the schema. No markdown fences or commentary.':''}`;
  add('generating',locked?'Processing source · parallel extraction mode':`Generating with ${params.model||'Gemini 3.7 Flash'}`);
  let raw='';let generationError='';const provider=aiRegistry.getProvider('gemini');const inline=(params.attachedFiles||[]).filter(f=>!!f.base64Data).map(f=>({mimeType:f.type||'application/pdf',data:(f.base64Data||'').replace(/^data:[^;]+;base64,/,'')}));
  try{
   if(structured&&locked&&inline.length){
    const requested=countRequested(params.userPrompt);const totalQ=requested&&requested>0?requested:180;const chunkSize=20;const chunks:Array<{start:number;end:number}>=[];
    for(let startQ=1;startQ<=totalQ;startQ+=chunkSize)chunks.push({start:startQ,end:Math.min(startQ+chunkSize-1,totalQ)});
    const merged:any={title:'',instituteName:'',examType:'',subject:'',duration:'',totalMarks:'',instructions:[],questions:[]};
    const extractChunk=async(c:{start:number;end:number})=>{
      let lastError='';
      for(let attempt=1;attempt<=3;attempt++){
       try{
        add('working',`SOURCE EXTRACTION · Q.${c.start}–Q.${c.end}`,`Batch ${Math.ceil(c.start/chunkSize)} · attempt ${attempt}`);
        const chunkRaw=await provider.generateText(`Extract ONLY the complete questions numbered ${c.start} through ${c.end} from the attached PDF. Read every page needed to locate this range. Return every question in exact source order. Return exactly ${c.end-c.start+1} questions when those numbers exist. If the document ends before ${c.start}, return an empty questions array. For every question return English text, faithful Hindi translation, exactly four options in order, and diagramSvg when the source question contains a graph/figure/image. Preserve all formulas using LaTeX: \\frac{...}{...}, ^{...}, _{...}, \\sqrt{...} and symbol commands. Do not summarize, skip, invent, correct, merge, or renumber anything.`,{systemInstruction:system,model:params.model||'gemini-3.7-flash',responseMimeType:'application/json',responseSchema:PAPER_SCHEMA,inlineFiles:inline});
        const chunk=extractJson(chunkRaw);const questions=Array.isArray(chunk.questions)?chunk.questions:[];
        if(!questions.length&&c.start<=totalQ)throw new Error(`Empty extraction for Q.${c.start}–Q.${c.end}.`);
        if(questions.length!==c.end-c.start+1)throw new Error(`Incomplete batch Q.${c.start}–Q.${c.end}: received ${questions.length}.`);
        const nums=questions.map((q:any)=>Number(String(q.number||'').replace(/^Q\.?(?:Q\.)?/i,'')));
        for(let i=0;i<nums.length;i++)if(nums[i]!==c.start+i)throw new Error(`Batch numbering mismatch: expected Q.${c.start+i}, received Q.${nums[i]||'?'}.'`);
        return {chunk,questions};
       }catch(e:any){lastError=e?.message||'Generation failed';if(attempt<3){add('working',`Retrying source batch Q.${c.start}–Q.${c.end}`,lastError);await sleep(1200*attempt);}}
      }
      throw new Error(`Source extraction failed for Q.${c.start}–Q.${c.end} after 3 attempts: ${lastError}`);
    };
    const concurrency=3;
    for(let i=0;i<chunks.length;i+=concurrency){
      const batch=chunks.slice(i,i+concurrency);add('working',`PARALLEL EXTRACTION · ${batch.map(c=>`Q.${c.start}–${c.end}`).join(' + ')}`,`Processing ${batch.length} source ranges concurrently.`);
      const results=await Promise.all(batch.map(extractChunk));
      for(const result of results){const chunk=result.chunk;if(!merged.title){Object.assign(merged,{title:chunk.title||'',instituteName:chunk.instituteName||'',examType:chunk.examType||'',subject:chunk.subject||'',duration:chunk.duration||'',totalMarks:chunk.totalMarks??'',instructions:Array.isArray(chunk.instructions)?chunk.instructions:[]});}merged.questions.push(...result.questions);}
      merged.questions.sort((a:any,b:any)=>Number(String(a.number).replace(/^Q\.?(?:Q\.)?/i,''))-Number(String(b.number).replace(/^Q\.?(?:Q\.)?/i,'')));
      add('checking',`SOURCE CHECKPOINT · ${Math.min((i+batch.length)*chunkSize,totalQ)}/${totalQ} questions captured`,`Completed and validated parallel source batches.`);
    }
    raw=JSON.stringify(merged);
   }else{
    for(let attempt=1;attempt<=2;attempt++){try{raw=await provider.generateText(attempt===1?params.userPrompt:`Repair the previous JARVIS output. Return a complete valid response that satisfies the original request exactly. Do not omit content. ${params.userPrompt}`,{systemInstruction:system,model:params.model||'gemini-3.7-flash',responseMimeType:structured?'application/json':undefined,responseSchema:structured?PAPER_SCHEMA:undefined,inlineFiles:inline.length?inline:undefined});generationError='';break;}catch(e:any){generationError=e.message||'Generation failed';if(attempt===1)add('working','Retrying AI generation after transient failure');}}
   }
  }catch(e:any){generationError=e.message||'Generation failed';}
  if(generationError)return fail(`Generation failed: ${generationError}`);
  add('checking',locked?'Running source-fidelity + bilingual QA':'Running structural + output QA');let data:DocxPaperData;
  try{data=structured?this.fromJson(extractJson(raw),params.userPrompt,configuredInstitute,configuredExam,locked):{title:params.userPrompt.slice(0,60),instituteName:configuredInstitute,examType:configuredExam,rawContent:raw};if(structured)validate(data,params.userPrompt,locked);if(locked&&structured)this.validateSequence(data);}
  catch(e:any){return fail(`QA failed: ${e.message}`);}
  const artifacts:GeneratedArtifact[]=[];try{const buf=await generateDocxBuffer(data);artifacts.push({id:`art-${Date.now()}-1`,name:`${agent.shortCode}_${Date.now()}.docx`,fileType:'docx',docxBase64:buf.toString('base64'),size:buf.length,metadata:{title:data.title,questionsCount:data.questions?.length||0}});}catch(e:any){return fail(`DOCX generation failed: ${e.message}`);}artifacts.push({id:`art-${Date.now()}-2`,name:`${agent.shortCode}_content.${structured?'json':'md'}`,fileType:structured?'json':'markdown',content:structured?JSON.stringify(data,null,2):raw,size:Buffer.byteLength(structured?JSON.stringify(data):raw,'utf8')});
  const result:ExecutionResult={summary:`Successfully executed by ${agent.name}`,rawText:raw,structuredData:data,artifacts,agentUsed:{id:agent.id,name:agent.name},metrics:{durationMs:Date.now()-start}};try{validateExecutionResult(result,locked);}catch(e:any){return fail(e.message);}add('completed',locked?'Source-faithful bilingual document ready':'Task completed successfully');const task:TaskRecord={id,title:params.userPrompt.slice(0,70),userPrompt:params.userPrompt,agentId:agent.id,agentName:agent.name,status:'completed',createdAt:new Date(start).toISOString(),completedAt:new Date().toISOString(),steps,attachedFiles:params.attachedFiles||[],result};try{validateTaskRecord(task);saveTask(task);}catch(e:any){return fail(`Task persistence/validation failed: ${e.message}`);}return task;
 }
 private static validateSequence(data:DocxPaperData){const qs=[...(data.questions||[])].map(q=>Number(String(q.number).replace(/^Q\.?(?:Q\.)?/i,''))).filter(Number.isFinite);if(!qs.length)return;for(let i=1;i<qs.length;i++){if(qs[i]!==qs[i-1]+1)throw new Error(`Source question sequence has a gap after Q.${qs[i-1]} (next is Q.${qs[i]}).`);}}
 private static fromJson(data:any,prompt:string,configuredInstitute:string,configuredExam:string,locked:boolean):DocxPaperData{if(!data||!Array.isArray(data.questions))throw new Error('No questions array returned.');return{title:String(data.title||prompt.slice(0,60)),instituteName:String(data.instituteName||(!locked?configuredInstitute:'')),examType:String(data.examType||(!locked?configuredExam:'')),subject:String(data.subject||''),duration:String(data.duration||''),totalMarks:data.totalMarks??'',instructions:Array.isArray(data.instructions)?data.instructions:[],includeAnswerKey:!locked&&wantsKey(prompt),includeSolutions:!locked&&wantsSolutions(prompt),questions:data.questions.map((q:any,i:number)=>({number:String(q.number||i+1).replace(/^Q\.?(?:Q\.)?/i,''),textEn:String(q.textEn||'').trim(),textHi:String(q.textHi||'').trim(),optionsEn:Array.isArray(q.options)?q.options.map((o:any)=>String(o?.en||'').trim()):[],optionsHi:Array.isArray(q.options)?q.options.map((o:any)=>String(o?.hi||'').trim()):[],correctOption:normalizeOption(String(q.correctOption||'')),solution:String(q.solution||'').trim(),diagramSvg:typeof q.diagramSvg==='string'&&q.diagramSvg.trim()?q.diagramSvg.trim():undefined}))};}
 private static failed(id:string,start:number,params:ExecuteTaskParams,agent:any,steps:TaskStep[],error:string):TaskRecord{return{id,title:params.userPrompt.slice(0,60),userPrompt:params.userPrompt,agentId:agent?.id||'jarvis',agentName:agent?.name||'JARVIS',status:'failed',createdAt:new Date(start).toISOString(),completedAt:new Date().toISOString(),steps,attachedFiles:params.attachedFiles||[],error};}
}
