import { jarvisRecoveryDecision } from '../../server/jarvis-brain.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const decision = await jarvisRecoveryDecision({
      objective: String(body.objective || 'Complete the current JARVIS task.'),
      progress: String(body.progress || 'No checkpoint details available.'),
      error: String(body.error || 'Unknown failure'),
    });
    return res.status(200).json(decision);
  } catch (error: any) {
    return res.status(200).json({ decision: 'retry', reason: error?.message || 'Recovery brain unavailable; retrying the checkpoint.' });
  }
}
