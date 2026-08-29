import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { agentRegistry } from './server/agents/definitions.js';
import { memoryStore } from './server/memory.js';
import { TaskRunner } from './server/task-runner.js';
import { aiRegistry } from './server/ai/provider.js';
import { generateDocxBuffer } from './server/docx-generator.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 PDF / image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'JARVIS AI Office',
      timestamp: new Date().toISOString(),
      aiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // 2. AI Providers Info
  app.get('/api/providers', (req, res) => {
    res.json({
      providers: aiRegistry.listProviders(),
      current: 'gemini',
      isApiKeySet: !!process.env.GEMINI_API_KEY,
    });
  });

  // 3. Agents Management
  app.get('/api/agents', (req, res) => {
    res.json({ agents: agentRegistry.getAllAgents() });
  });

  app.post('/api/agents', (req, res) => {
    try {
      const { name, description, capabilities, systemPrompt, inputRequirements, outputTypes, iconName } = req.body;
      if (!name || !systemPrompt) {
        return res.status(400).json({ error: 'Name and System Prompt are required' });
      }

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
      if (!updated) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ agent: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/agents/:id', (req, res) => {
    try {
      const deleted = agentRegistry.deleteCustomAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Agent not found or cannot delete built-in agent' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Memory Management
  app.get('/api/memory', (req, res) => {
    res.json({ memories: memoryStore.getAll() });
  });

  app.post('/api/memory', (req, res) => {
    try {
      const { category, key, value, id } = req.body;
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and Value are required' });
      }
      const entry = memoryStore.set({
        id,
        category: category || 'custom',
        key,
        value,
      });
      res.status(201).json({ memory: entry });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/memory/:id', (req, res) => {
    try {
      const deleted = memoryStore.delete(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/memory/clear', (req, res) => {
    try {
      memoryStore.clear();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Intent / Agent Prediction Check
  app.post('/api/tasks/route-check', (req, res) => {
    const { prompt, attachedFiles, selectedAgentId } = req.body;
    const routedAgentId = TaskRunner.routeAgent(prompt || '', attachedFiles, selectedAgentId);
    const agent = agentRegistry.getAgent(routedAgentId);
    res.json({
      routedAgentId,
      agent,
    });
  });

  // 6. Execute Task Pipeline
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

  // 7. Direct DOCX Generator Endpoint
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

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS AI Office] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
