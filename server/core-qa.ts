import { ExecutionResult, TaskRecord } from '../src/types/index.js';

export interface QAReport {
  passed: boolean;
  checks: string[];
  warnings: string[];
}

export function validateExecutionResult(result: ExecutionResult, sourceLocked = false): QAReport {
  const checks: string[] = [];
  const warnings: string[] = [];
  if (!result.summary?.trim()) throw new Error('QA failed: execution summary is empty.');
  checks.push('summary');
  if (!result.agentUsed?.id || !result.agentUsed?.name) throw new Error('QA failed: agent identity is missing.');
  checks.push('agent identity');
  if (!result.rawText?.trim() && !result.structuredData) throw new Error('QA failed: AI returned no usable content.');
  checks.push('usable output');
  if (!Array.isArray(result.artifacts) || result.artifacts.length === 0) throw new Error('QA failed: no output artifact was produced.');
  checks.push('artifact');
  if (sourceLocked && result.structuredData?.questions && !Array.isArray(result.structuredData.questions)) {
    throw new Error('QA failed: source-locked question data is malformed.');
  }
  if (result.metrics && result.metrics.durationMs < 0) throw new Error('QA failed: invalid execution duration.');
  checks.push('metadata');
  return { passed: true, checks, warnings };
}

export function validateTaskRecord(task: TaskRecord): void {
  if (!task.id || !task.title || !task.agentId || !task.createdAt) throw new Error('Task record is missing required identity fields.');
  if (!Array.isArray(task.steps) || task.steps.length === 0) throw new Error('Task record has no execution steps.');
  if (task.status === 'completed' && !task.result) throw new Error('Completed task has no execution result.');
  if (task.status === 'failed' && !task.error) throw new Error('Failed task has no error detail.');
}
