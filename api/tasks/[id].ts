import { deleteTask, getTask } from '../../server/persistence.js';

export default function handler(req: any, res: any) {
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Task id is required' });

  if (req.method === 'GET') {
    const task = getTask(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ task });
  }

  if (req.method === 'DELETE') {
    return res.status(200).json({ success: deleteTask(id) });
  }

  res.setHeader('Allow', 'GET, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
