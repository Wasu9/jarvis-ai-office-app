import { TaskRunner } from '../../server/task-runner.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
  },
};

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Keep long Gemini extraction requests alive even while the model is thinking.
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* connection already closed */ }
  }, 10000);

  try {
    const task = await TaskRunner.execute({
      ...req.body,
      onStep: (step: any) => {
        res.write(`data: ${JSON.stringify({ type: 'step', step })}\n\n`);
      },
    });
    res.write(`data: ${JSON.stringify({ type: 'task', task })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message || 'Task execution failed' })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}
