import {
  AgentDefinition,
  AttachedFile,
  JarvisMemoryItem,
  JarvisSettings,
  TaskRecord,
} from '../types';

export const DEFAULT_SETTINGS: JarvisSettings = {
  instituteName: 'Apex NEET & JEE Institute',
  tagline: 'Excellence in Medical & Engineering Entrance',
  defaultTargetExam: 'NEET',
  primaryLanguage: 'bilingual',
  aiModel: 'gemini-3.7-flash',
  voiceAutoSpeak: false,
  watermarkText: 'APEX ACADEMY',
  contactNumber: '+91 98765 43210',
  theme: 'slate',
};

export class ApiService {
  static async checkHealth() {
    const res = await fetch('/api/health');
    return await res.json();
  }

  static async getProviders() {
    const res = await fetch('/api/providers');
    return await res.json();
  }

  static async getAgents(): Promise<AgentDefinition[]> {
    const res = await fetch('/api/agents');
    const data = await res.json();
    return data.agents || [];
  }

  static async createAgent(agentData: Partial<AgentDefinition>): Promise<AgentDefinition> {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create agent');
    }
    const data = await res.json();
    return data.agent;
  }

  static async updateAgent(id: string, updates: Partial<AgentDefinition>): Promise<AgentDefinition> {
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.agent;
  }

  static async deleteAgent(id: string): Promise<boolean> {
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }

  static async getMemories(): Promise<JarvisMemoryItem[]> {
    const res = await fetch('/api/memory');
    const data = await res.json();
    return data.memories || [];
  }

  static async saveMemory(item: Partial<JarvisMemoryItem>): Promise<JarvisMemoryItem> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    return data.memory;
  }

  static async deleteMemory(id: string): Promise<boolean> {
    const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }

  static async clearAllMemory(): Promise<boolean> {
    const res = await fetch('/api/memory/clear', { method: 'POST' });
    const data = await res.json();
    return data.success;
  }

  static async checkAgentRoute(prompt: string, attachedFiles?: AttachedFile[], selectedAgentId?: string) {
    const res = await fetch('/api/tasks/route-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, attachedFiles, selectedAgentId }),
    });
    return await res.json();
  }

  static async executeTask(params: {
    userPrompt: string;
    selectedAgentId?: string;
    attachedFiles?: AttachedFile[];
    model?: string;
    settings?: Partial<JarvisSettings>;
  }): Promise<TaskRecord> {
    const res = await fetch('/api/tasks/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.task?.error || 'Failed to execute task');
    return data.task;
  }
}
