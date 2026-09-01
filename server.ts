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
import { persistenceInfo, saveCustomAgents, saveMemories, loadTasks, getTask, deleteTask, clearTasks } from './server/persistence.js';

dotenv.config();

function persistAgents() {
  saveCustomAgents(agentRegistry.getAllAgents().filter((a) => a.isCustom && !a.id.startsWith('agency-')));
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'JARVIS AI Office', version: '2.5.0', timestamp: new Date().toISOString(), aiConfigured: !!process.env.GEMINI_API_KEY, persistence: persistenceInfo() }));
  app.get('/api/providers', (_req, res) => res.json({ providers: aiRegistry.listProviders(), current: 'gemini', isApiKeySet: !!process.env.GEMINI_API_KEY }));
  app.get('/api/agents', (_req, res) => res.json({ agents: agentRegistry.getAllAgents() }));

  app.post('/api/agents', (req, res) => {
    try {
      const { name, description, capabilities, systemPrompt, inputRequirements, outputTypes, iconName } = req.body;
      if (!name || !systemPrompt) return res.status(400).json({ error: 'Name and System Prompt are required' });
      const agent = agentRegistry.addCustomAgent({ name, description: description || 'Custom AI Agent', capabilities: capabilities || ['custom'], systemPrompt, inputRequirements: inputRequirements || ['User instructions'], outputTypes: outputTypes || ['markdown', 'docx'], category: 'custom', enabled: true, iconName: iconName || 'Bot', samplePrompts: [] });
      persistAgents();
      res.status(201).json({ agent });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/agents/:id', (req, res) => {
    try {
      const updated = agentRegistry.updateAgent(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Agent not found' });
      persistAgents();
      res.json({ agent: updated });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/agents/:id', (req, res) => {
    try {
      const deleted = agentRegistry.deleteCustomAgent(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Agent not found or cannot delete built-in agent' });
      persistAgents();
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/memory', (_req, res) => res.json({ memories: memoryStore.getAll() }));
  app.post('/api/memory', (req, res) => {
    try {
      const { category, key, value, id } = req.body;
      if (!key || !value) return res.status(400).json({ error: 'Key and Value are required' });
      const memory = memoryStore.set({ id, category: category || 'custom', key, value });
      saveMemories(memoryStore.getAll());
      res.status(201).json({ memory });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.delete('/api/memory/:id', (req, res) => { try { const success = memoryStore.delete(req.params.id); saveMemories(memoryStore.getAll()); res.json({ success }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
  app.post('/api/memory/clear', (_req, res) => { try { memoryStore.clear(); saveMemories([]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });

  app.get('/api/tasks', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const tasks = loadTasks().filter((task) => !status || task.status === status).slice(0, limit);
    res.json({ tasks, count: tasks.length, limit });
  });
  app.get('/api/tasks/:id', (req, res) => {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  });
  app.delete('/api/tasks/:id', (req, res) => res.json({ success: deleteTask(req.params.id) }));
  app.post('/api/tasks/clear', (_req, res) => { clearTasks(); res.json({ success: true }); });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, model, history } = req.body;
      if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
      const reply = await chatWithJarvis(message, model, Array.isArray(history) ? history : []);
      res.json({ reply });
    } catch (err: any) { console.error('[Chat Error]', err); res.status(500).json({ error: err.message || 'Chat failed' }); }
  });

  app.post('/api/tasks/route-check', (req, res) => {
    try { const { prompt, attachedFiles, selectedAgentId } = req.body; const routedAgentId = TaskRunner.routeAgent(prompt || '', attachedFiles, selectedAgentId); persistAgents(); res.json({ routedAgentId, agent: agentRegistry.getAgent(routedAgentId) }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/tasks/execute', async (req, res) => {
    try {
      const { userPrompt, selectedAgentId, attachedFiles, model, settings } = req.body;
      if (!userPrompt && (!attachedFiles || attachedFiles.length === 0)) return res.status(400).json({ error: 'Prompt or attached file is required' });
      const task = await TaskRunner.execute({ userPrompt: userPrompt || 'Process the attached document.', selectedAgentId, attachedFiles, model, settings });
      persistAgents();
      res.json({ task });
    } catch (err: any) { console.error('[Execute Task Error]', err); res.status(500).json({ error: err.message || 'Task execution failed' }); }
  });

  app.post('/api/tasks/execute-stream', async (req, res) => {
    const { userPrompt, selectedAgentId, attachedFiles, model, settings } = req.body;
    if (!userPrompt && (!attachedFiles || attachedFiles.length === 0)) return res.status(400).json({ error: 'Prompt or attached file is required' });
    res.status(200); res.setHeader('Content-Type', 'text/event-stream; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.setHeader('X-Accel-Buffering', 'no'); (res as any).flushHeaders?.();
    const send = (payload: any) => { if (!(res as any).writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`); };
    try {
      const task = await TaskRunner.execute({ userPrompt: userPrompt || 'Process the attached document.', selectedAgentId, attachedFiles, model, settings, onStep: step => send({ type: 'step', step }) });
      persistAgents(); send({ type: 'task', task }); send({ type: 'done' });
    } catch (err: any) { send({ type: 'error', error: err.message || 'Task execution failed' }); }
    finally { if (!(res as any).writableEnded) res.end(); }
  });

  app.post('/api/generate-docx', async (req, res) => {
    try { const b = await generateDocxBuffer(req.body); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); res.setHeader('Content-Disposition', 'attachment; filename="JARVIS_document.docx"'); res.send(b); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`[JARVIS AI Office] Server listening on http://0.0.0.0:${PORT}`));
}

startServer().catch(err => console.error('Failed to start server:', err));
