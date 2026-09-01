import { loadTasks } from '../../server/persistence.js';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawLimit = Number(req.query?.limit ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100);
  const status = typeof req.query?.status === 'string' ? req.query.status : '';
  const tasks = loadTasks().filter((task) => !status || task.status === status).slice(0, limit);
  return res.status(200).json({ tasks, count: tasks.length, limit });
}
