import fs from 'node:fs';
import path from 'node:path';
import { TaskRecord } from '../src/types/index.js';

export interface PersistedAgent {
  id?: string;
  name: string;
  description?: string;
  capabilities?: string[];
  systemPrompt: string;
  inputRequirements?: string[];
  outputTypes?: string[];
  category?: string;
  enabled?: boolean;
  iconName?: string;
  samplePrompts?: string[];
  isCustom?: boolean;
}

export interface PersistedMemory {
  id?: string;
  category: string;
  key: string;
  value: string;
  updatedAt?: string;
}

const DATA_DIR = process.env.JARVIS_DATA_DIR?.trim() || path.join(process.cwd(), '.jarvis-data');
const AGENTS_FILE = path.join(DATA_DIR, 'custom-agents.json');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const MAX_PERSISTED_TASKS = 100;

function canPersist(): boolean {
  return process.env.JARVIS_DISABLE_FILE_PERSISTENCE !== 'true';
}

function ensureDataDir(): void {
  if (!canPersist()) return;
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* best effort */ }
}

function readJson<T>(file: string, fallback: T): T {
  if (!canPersist()) return fallback;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, value: T): void {
  if (!canPersist()) return;
  try {
    ensureDataDir();
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(temp, file);
  } catch {
    // Persistence must never take JARVIS offline.
  }
}

export function loadCustomAgents(): PersistedAgent[] {
  const agents = readJson<unknown>(AGENTS_FILE, []);
  return Array.isArray(agents) ? agents.filter((a): a is PersistedAgent => !!a && typeof a === 'object' && typeof (a as any).name === 'string' && typeof (a as any).systemPrompt === 'string') : [];
}

export function saveCustomAgents(agents: PersistedAgent[]): void {
  writeJson(AGENTS_FILE, agents.filter((a) => !String(a.id || '').startsWith('agency-')));
}

export function loadMemories(): PersistedMemory[] {
  const memories = readJson<unknown>(MEMORY_FILE, []);
  return Array.isArray(memories) ? memories.filter((m): m is PersistedMemory => !!m && typeof m === 'object' && typeof (m as any).category === 'string' && typeof (m as any).key === 'string' && typeof (m as any).value === 'string') : [];
}

export function saveMemories(memories: PersistedMemory[]): void {
  writeJson(MEMORY_FILE, memories);
}

function compactTask(task: TaskRecord): TaskRecord {
  const { checkpoint: _checkpoint, ...withoutCheckpoint } = task;
  return {
    ...withoutCheckpoint,
    attachedFiles: task.attachedFiles.map(({ base64Data: _base64Data, ...file }) => file),
    result: task.result ? {
      ...task.result,
      rawText: task.result.rawText.slice(0, 20000),
      artifacts: task.result.artifacts.map(({ docxBase64: _docxBase64, content, ...artifact }) => ({
        ...artifact,
        content: content?.slice(0, 20000),
      })),
    } : undefined,
  };
}

export function loadTasks(): TaskRecord[] {
  const tasks = readJson<unknown>(TASKS_FILE, []);
  return Array.isArray(tasks) ? tasks.filter((t): t is TaskRecord => !!t && typeof t === 'object' && typeof (t as any).id === 'string' && typeof (t as any).title === 'string') : [];
}

export function saveTask(task: TaskRecord): void {
  const tasks = loadTasks().filter((t) => t.id !== task.id);
  tasks.unshift(compactTask(task));
  writeJson(TASKS_FILE, tasks.slice(0, MAX_PERSISTED_TASKS));
}

export function getTask(id: string): TaskRecord | undefined {
  return loadTasks().find((task) => task.id === id);
}

export function deleteTask(id: string): boolean {
  const tasks = loadTasks();
  const next = tasks.filter((task) => task.id !== id);
  if (next.length === tasks.length) return false;
  writeJson(TASKS_FILE, next);
  return true;
}

export function clearTasks(): void {
  writeJson(TASKS_FILE, []);
}

export function persistenceInfo() {
  return { enabled: canPersist(), dataDir: DATA_DIR, taskHistoryLimit: MAX_PERSISTED_TASKS };
}
