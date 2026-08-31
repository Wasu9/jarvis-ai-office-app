import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import './server/agents/agency-bootstrap.js';
import { agentRegistry } from './server/agents/definitions.js';
import { memoryStore } from './server/memory.js';
import { TaskRunner } from './server/task-runner.js';
import { aiRegistry } from './server/ai/provider.js';
import { generateDocxBuffer } from './server/docx-generator.js';
import { chatWithJarvis } from './server/chat.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.get('/api/health', (req,res)=>res.json({status:'ok',service:'JARVIS AI Office',timestamp:new Date().toISOString(),aiConfigured:!!process.env.GEMINI_API_KEY}));
  app.get('/api/providers',(req,res)=>res.json({providers:aiRegistry.listProviders(),current:'gemini',isApiKeySet:!!process.env.GEMINI_API_KEY}));
  app.get('/api/agents',(req,res)=>res.json({agents:agentRegistry.getAllAgents()}));
  app.post('/api/agents',(req,res)=>{try{const {name,description,capabilities,systemPrompt,inputRequirements,outputTypes,iconName}=req.body;if(!name||!systemPrompt)return res.status(400).json({error:'Name and System Prompt are required'});const agent=agentRegistry.addCustomAgent({name,description:description||'Custom AI Agent',capabilities:capabilities||['custom'],systemPrompt,inputRequirements:inputRequirements||['User instructions'],outputTypes:outputTypes||['markdown','docx'],category:'custom',enabled:true,iconName:iconName||'Bot',samplePrompts:[]});res.status(201).json({agent});}catch(err:any){res.status(500).json({error:err.message});}});
  app.put('/api/agents/:id',(req,res)=>{try{const updated=agentRegistry.updateAgent(req.params.id,req.body);if(!updated)return res.status(404).json({error:'Agent not found'});res.json({agent:updated});}catch(err:any){res.status(500).json({error:err.message});}});
  app.delete('/api/agents/:id',(req,res)=>{try{const deleted=agentRegistry.deleteCustomAgent(req.params.id);if(!deleted)return res.status(404).json({error:'Agent not found or cannot delete built-in agent'});res.json({success:true});}catch(err:any){res.status(500).json({error:err.message});}});
  app.get('/api/memory',(req,res)=>res.json({memories:memoryStore.getAll()}));
  app.post('/api/memory',(req,res)=>{try{const {category,key,value,id}=req.body;if(!key||!value)return res.status(400).json({error:'Key and Value are required'});res.status(201).json({memory:memoryStore.set({id,category:category||'custom',key,value})});}catch(err:any){res.status(500).json({error:err.message});}});
  app.delete('/api/memory/:id',(req,res)=>{try{res.json({success:memoryStore.delete(req.params.id)});}catch(err:any){res.status(500).json({error:err.message});}});
  app.post('/api/memory/clear',(req,res)=>{try{memoryStore.clear();res.json({success:true});}catch(err:any){res.status(500).json({error:err.message});}});
  app.post('/api/chat',async(req,res)=>{try{const {message,model,history}=req.body;if(!message?.trim())return res.status(400).json({error:'Message is required'});const reply=await chatWithJarvis(message,model,Array.isArray(history)?history:[]);res.json({reply});}catch(err:any){console.error('[Chat Error]',err);res.status(500).json({error:err.message||'Chat failed'});}});
  app.post('/api/tasks/route-check',(req,res)=>{const {prompt,attachedFiles,selectedAgentId}=req.body;const routedAgentId=TaskRunner.routeAgent(prompt||'',attachedFiles,selectedAgentId);res.json({routedAgentId,agent:agentRegistry.getAgent(routedAgentId)});});
  app.post('/api/tasks/execute',async(req,res)=>{try{const {userPrompt,selectedAgentId,attachedFiles,model,settings}=req.body;if(!userPrompt&&(!attachedFiles||attachedFiles.length===0))return res.status(400).json({error:'Prompt or attached file is required'});res.json({task:await TaskRunner.execute({userPrompt:userPrompt||'Process the attached document.',selectedAgentId,attachedFiles,model,settings})});}catch(err:any){console.error('[Execute Task Error]',err);res.status(500).json({error:err.message||'Task execution failed'});}});
  app.post('/api/tasks/execute-stream',async(req,res)=>{const {userPrompt,selectedAgentId,attachedFiles,model,settings}=req.body;if(!userPrompt&&(!attachedFiles||attachedFiles.length===0))return res.status(400).json({error:'Prompt or attached file is required'});res.status(200);res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-cache, no-transform');res.setHeader('Connection','keep-alive');res.setHeader('X-Accel-Buffering','no');(res as any).flushHeaders?.();const send=(payload:any)=>{if(!(res as any).writableEnded)res.write(`data: ${JSON.stringify(payload)}\n\n`);};try{const task=await TaskRunner.execute({userPrompt:userPrompt||'Process the attached document.',selectedAgentId,attachedFiles,model,settings,onStep:step=>send({type:'step',step})});send({type:'task',task});send({type:'done'});}catch(err:any){send({type:'error',error:err.message||'Task execution failed'});}finally{if(!(res as any).writableEnded)res.end();}});
  app.post('/api/generate-docx',async(req,res)=>{try{const b=await generateDocxBuffer(req.body);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');res.setHeader('Content-Disposition','attachment; filename="JARVIS_document.docx"');res.send(b);}catch(err:any){res.status(500).json({error:err.message});}});
  if(process.env.NODE_ENV!=='production'){const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{const distPath=path.join(process.cwd(),'dist');app.use(express.static(distPath));app.get('*',(req,res)=>res.sendFile(path.join(distPath,'index.html')));}
  app.listen(PORT,'0.0.0.0',()=>console.log(`[JARVIS AI Office] Server listening on http://0.0.0.0:${PORT}`));
}
startServer().catch(err=>console.error('Failed to start server:',err));
