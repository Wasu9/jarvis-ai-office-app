import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../server/agents/agency-bootstrap.js';
import { TaskRunner } from '../server/task-runner.js';
import { agentRegistry } from '../server/agents/definitions.js';
import { validateExecutionResult, validateTaskRecord } from '../server/core-qa.js';

test('routes NEET paper requests to the exam paper agent', () => {
  const id = TaskRunner.routeAgent('Create 10 NEET Physics questions on Current Electricity');
  assert.equal(id, 'neet-jee-paper');
});

test('routes uploaded bilingual PDF conversion to the PDF agent', () => {
  const id = TaskRunner.routeAgent('Convert this PDF to exact Hindi-English bilingual format', [
    { id: 'f1', name: 'paper.pdf', type: 'application/pdf', size: 10 } as any,
  ]);
  assert.equal(id, 'pdf-bilingual');
});

test('routes uploaded PDF reading to the source-locked PDF agent', () => {
  const id = TaskRunner.routeAgent('Read this uploaded PDF and make a Word document', [
    { id: 'f2', name: 'chapter.pdf', type: 'application/pdf', size: 10 } as any,
  ]);
  assert.equal(id, 'pdf-bilingual');
});

test('agency library agents are available in the runtime registry', () => {
  const architect = agentRegistry.getAgent('agency-multi-agent-architect');
  assert.ok(architect);
  assert.equal(architect?.enabled, true);
});

test('route-check can create a specialist for an unknown request', () => {
  const id = TaskRunner.routeAgent('Build a specialist for chemistry lab inventory reconciliation');
  const agent = agentRegistry.getAgent(id);
  assert.ok(agent);
  assert.equal(agent?.isCustom, true);
});

test('core QA rejects an execution without artifacts', () => {
  assert.throws(() => validateExecutionResult({
    summary: 'ok',
    rawText: 'hello',
    artifacts: [],
    agentUsed: { id: 'x', name: 'X' },
  }));
});

test('core QA accepts a complete execution result', () => {
  const report = validateExecutionResult({
    summary: 'completed',
    rawText: 'hello',
    artifacts: [{ id: 'a', name: 'out.md', fileType: 'markdown', content: 'hello' }],
    agentUsed: { id: 'x', name: 'X' },
    metrics: { durationMs: 10 },
  });
  assert.equal(report.passed, true);
});

test('core QA validates task lifecycle records', () => {
  assert.doesNotThrow(() => validateTaskRecord({
    id: 'task-test', title: 'Test', userPrompt: 'Test', agentId: 'x', agentName: 'X', status: 'completed',
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    steps: [{ status: 'completed', label: 'done', timestamp: new Date().toISOString() }], attachedFiles: [],
    result: { summary: 'done', rawText: 'ok', artifacts: [{ id: 'a', name: 'x.md', fileType: 'markdown' }], agentUsed: { id: 'x', name: 'X' } },
  }));
});
