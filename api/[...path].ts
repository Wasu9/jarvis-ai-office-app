import express from 'express';
import { agentRegistry } from '../server/agents/definitions.js';
import { memoryStore } from '../server/memory.js';
import { TaskRunner } from '../server/task-runner.js';
import { aiRegistry } from '../server/ai/provider.js';
import { generateDocxBuffer } from '../server/docx-generator.js';

const app = express();

// Vercel serverless function: keep the same JSON/file limits as local JARVIS.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Vercel's catch-all function can receive the request path with or without
// the /api prefix depending on the deployment routing layer. Normalize it so
// every API endpoint below is reachable consistently in production.
app.use((req, _res, next) => {
  if (req.url === '/') {
    next();
    return;
  }
  if (!req.url.startsWith('/api/')) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'JARVIS AI Office',
    timestamp: new Date().toISOString(),
    aiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

app.get('/api/providers', (_req, res) => {
  res.json({
    providers: aiRegistry.listProviders(),
    current: 'gemini',
    isApiKeySet: !!process.env.GEMINI_API_KEY,
  });
});

app.get('/api/agents', (_req, res) => {
  res.json({ agents: agentRegistry.getAllAgents() });
});

app.post('/api/agents', (req, res) => {
  try {
    const { name, description, capabilities, systemPrompt, inputRequirements, outputTypes, iconName } = req.body;
    if (!name || !systemPrompt) return res.status(400).json({ error: 'Name and System Prompt are required' });

    const newAgent = agentRegistry.addCustomAgent({
      name,
      description: description || 'Custom AI Agent',
      capabilities: capabilities || ['custom'],
      systemPrompt,
      inputRequirements: inputRequirements || ['User instructions'],
      outputTypes: outputTypes || ['markdown', 'docx'],
      category: 'custom',
      enabled: true,
      iconName: iconName || 'Bot',
      samplePrompts: [],
    });
    res.status(201).json({ agent: newAgent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/agents/:id', (req, res) => {
  try {
    const updated = agentRegistry.updateAgent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  try {
    const deleted = agentRegistry.deleteCustomAgent(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Agent not found or cannot delete built-in agent' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory', (_req, res) => {
  res.json({ memories: memoryStore.getAll() });
});

app.post('/api/memory', (req, res) => {
  try {
    const { category, key, value, id } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'Key and Value are required' });
    const entry = memoryStore.set({ id, category: category || 'custom', key, value });
    res.status(201).json({ memory: entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/memory/:id', (req, res) => {
  try {
    res.json({ success: memoryStore.delete(req.params.id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/clear', (_req, res) => {
  try {
    memoryStore.clear();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/route-check', (req, res) => {
  try {
    const { prompt, attachedFiles, selectedAgentId } = req.body;
    const routedAgentId = TaskRunner.routeAgent(prompt || '', attachedFiles, selectedAgentId);
    const agent = agentRegistry.getAgent(routedAgentId);
    res.json({ routedAgentId, agent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/execute', async (req, res) => {
  try {
    const { userPrompt, selectedAgentId, attachedFiles, model, settings } = req.body;
    if (!userPrompt && (!attachedFiles || attachedFiles.length === 0)) {
      return res.status(400).json({ error: 'Prompt or attached file is required' });
    }

    const taskRecord = await TaskRunner.execute({
      userPrompt: userPrompt || 'Process the attached document.',
      selectedAgentId,
      attachedFiles,
      model,
      settings,
    });

    res.json({ task: taskRecord });
  } catch (err: any) {
    console.error('[Execute Task Error]', err);
    res.status(500).json({ error: err.message || 'Task execution failed' });
  }
});

app.post('/api/generate-docx', async (req, res) => {
  try {
    const docxBuffer = await generateDocxBuffer(req.body);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="JARVIS_document.docx"');
    res.send(docxBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export the Express app for Vercel. Do not call app.listen() in a serverless function.
export default app;
