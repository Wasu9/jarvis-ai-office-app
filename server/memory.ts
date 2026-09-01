import { JarvisMemoryItem } from '../src/types/index.js';
import { loadMemories } from './persistence.js';

class MemoryStore {
  private memories: Map<string, JarvisMemoryItem> = new Map();

  constructor() {
    this.seedDefaultMemories();
    this.restorePersistedMemories();
  }

  private seedDefaultMemories() {
    const defaults: Omit<JarvisMemoryItem, 'id' | 'updatedAt'>[] = [
      {
        category: 'institute',
        key: 'institute_name',
        value: 'Shaheen Academy Jaipur',
      },
      {
        category: 'institute',
        key: 'tagline',
        value: 'NEET & JEE preparation with AI-assisted academic operations',
      },
      {
        category: 'academic_preference',
        key: 'default_marking_scheme',
        value: 'NEET Pattern: +4 for Correct Answer, -1 for Incorrect Answer, 0 for Unattempted.',
      },
      {
        category: 'formatting',
        key: 'bilingual_style',
        value: 'Always keep English statement first, followed immediately by accurate Hindi translation (हिन्दी रूपान्तरण). Preserve all scientific equations and symbols.',
      },
    ];

    defaults.forEach((item, index) => {
      const id = `mem-${index + 1}`;
      this.memories.set(id, {
        ...item,
        id,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  private restorePersistedMemories() {
    const saved = loadMemories();
    if (!saved.length) return;
    this.memories.clear();
    for (const item of saved) {
      const id = item.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.memories.set(id, {
        category: item.category as JarvisMemoryItem['category'],
        key: item.key,
        value: item.value,
        id,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }

  getAll(): JarvisMemoryItem[] {
    return Array.from(this.memories.values());
  }

  get(id: string): JarvisMemoryItem | undefined {
    return this.memories.get(id);
  }

  set(item: Omit<JarvisMemoryItem, 'id' | 'updatedAt'> & { id?: string }): JarvisMemoryItem {
    const id = item.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry: JarvisMemoryItem = {
      ...item,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.memories.set(id, entry);
    return entry;
  }

  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  clear() {
    this.memories.clear();
  }

  getMemoryPromptContext(): string {
    const items = this.getAll();
    if (items.length === 0) return '';

    return `\n=== JARVIS PERSISTENT MEMORY & USER PREFERENCES ===\n` +
      items.map((m) => `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`).join('\n') +
      `\n===================================================\n`;
  }
}

export const memoryStore = new MemoryStore();
