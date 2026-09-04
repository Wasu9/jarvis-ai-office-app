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

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* connection already closed */ }
  }, 10000);

  try {
    const body = req.body || {};
    const sourceChunk = Number(body?.sourceRange?.start || 1) > 1 && Array.isArray(body?.resumeQuestions);
    const Runner: any = TaskRunner;
    const originalValidateSequence = Runner.validateSequence;

    // The server validates the cumulative document (Q1..current), while sourceRange
    // identifies only the chunk being extracted. Never start cumulative sequence QA at Q21.
    if (sourceChunk && typeof originalValidateSequence === 'function') {
      Runner.validateSequence = function (data: any, expected: number) {
        return originalValidateSequence.call(this, data, expected, 1);
      };
    }

    let task: any = null;
    let lastError = '';
    // Chunk-level recovery is owned by the client/recovery brain. Retrying the entire
    // source chunk inside one Vercel invocation can consume the full 300s runtime limit.
    const maxAttempts = 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          res.write(`data: ${JSON.stringify({ type: 'step', step: { status: 'generating', label: `AUTO-RESUME · Q.${body.sourceRange.start}–Q.${body.sourceRange.end}`, timestamp: new Date().toISOString(), details: `Automatic retry ${attempt}/${maxAttempts}; no manual action required.` } })}\n\n`);
        }
        task = await TaskRunner.execute({
          ...body,
          onStep: (step: any) => {
            res.write(`data: ${JSON.stringify({ type: 'step', step })}\n\n`);
          },
        });
        if (task?.status !== 'failed') break;
        lastError = task?.error || 'Task execution failed.';
      } catch (err: any) {
        lastError = err?.message || 'Task execution failed.';
      }
    }

    if (task?.status === 'failed' && sourceChunk) {
      task = { ...task, error: `Source chunk failed: ${lastError || task.error || 'unknown error'}` };
    }
    res.write(`data: ${JSON.stringify({ type: 'task', task })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message || 'Task execution failed' })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}
