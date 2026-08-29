import { JarvisMemoryItem } from '../src/types/index.js';

class MemoryStore {
  private memories: Map<string, JarvisMemoryItem> = new Map();

  constructor() {
    this.seedDefaultMemories();
  }

  private seedDefaultMemories() {
    const defaults: Omit<JarvisMemoryItem, 'id' | 'updatedAt'>[] = [
      {
        category: 'institute',
        key: 'institute_name',
        value: 'Apex NEET & JEE Institute of Excellence',
      },
      {
        category: 'institute',
        key: 'tagline',
        value: 'Transforming Aspirations into Ranks',
      },
      {
        category: 'institute',
        key: 'contact_info',
        value: 'Helpline: +91 98765 43210 | Kota, Rajasthan',
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

  getAll(): JarvisMemoryItem[] {
    return Array.from(this.memories.values());
  }

  get(id: string): JarvisMemoryItem | undefined {
    return this.memories.get(id);
  }

  set(item: Omit<JarvisMemoryItem, 'id' | 'updatedAt'> & { id?: string }): JarvisMemoryItem {
    const id = item.id || `mem-${Date.now()}`;
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
