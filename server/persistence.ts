import fs from 'node:fs';
import path from 'node:path';

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

function canPersist(): boolean {
  // Vercel/serverless filesystems are ephemeral. Persistence is intended for
  // the local zero-cost deployment and silently degrades to process memory in
  // read-only/serverless environments.
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

export function persistenceInfo() {
  return { enabled: canPersist(), dataDir: DATA_DIR };
}
