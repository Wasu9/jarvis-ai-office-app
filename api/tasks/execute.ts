import { TaskRunner } from '../../server/task-runner.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userPrompt, selectedAgentId, attachedFiles, model, settings } = req.body || {};

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

    return res.status(200).json({ task: taskRecord });
  } catch (err: any) {
    console.error('[Execute Task Error]', err);
    return res.status(500).json({
      error: err?.message || 'Task execution failed',
    });
  }
}
