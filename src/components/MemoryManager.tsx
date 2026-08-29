import React, { useState } from 'react';
import {
  BrainCircuit,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { JarvisMemoryItem } from '../types';
import { ApiService } from '../services/api';

interface MemoryManagerProps {
  memories: JarvisMemoryItem[];
  onRefreshMemories: () => void;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({
  memories,
  onRefreshMemories,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<JarvisMemoryItem['category']>('academic_preference');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      await ApiService.saveMemory({
        key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
        value: newValue.trim(),
        category: newCategory,
      });
      setShowAddModal(false);
      setNewKey('');
      setNewValue('');
      onRefreshMemories();
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  };

  const handleStartEdit = (mem: JarvisMemoryItem) => {
    setEditingId(mem.id);
    setEditValue(mem.value);
  };

  const handleSaveEdit = async (mem: JarvisMemoryItem) => {
    try {
      await ApiService.saveMemory({
        id: mem.id,
        key: mem.key,
        category: mem.category,
        value: editValue,
      });
      setEditingId(null);
      onRefreshMemories();
    } catch (err) {
      console.error('Failed to save memory edit:', err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await ApiService.deleteMemory(id);
      onRefreshMemories();
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all JARVIS memory preferences?')) return;
    try {
      await ApiService.clearAllMemory();
      onRefreshMemories();
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <BrainCircuit className="h-5 w-5 text-purple-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white tracking-tight sm:text-2xl">
              JARVIS Persistent Memory
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
            Stored preferences, institute identity, marking schemes, and custom formatting guidelines. JARVIS automatically grounds every generation with these active memories.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Memory Item</span>
          </button>

          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-all backdrop-blur-md"
              title="Clear all memories"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Grounding Info Box */}
      <div className="flex items-center space-x-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-200 backdrop-blur-md">
        <Info className="h-5 w-5 shrink-0 text-cyan-400" />
        <span>
          <strong>Active Memory Injection:</strong> All active memories listed below are formatted and injected as authoritative context into prompt executions across all agents.
        </span>
      </div>

      {/* Memory Items List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {memories.map((mem) => {
          const isEditing = editingId === mem.id;

          return (
            <div
              key={mem.id}
              className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl transition-all hover:border-white/20"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300 uppercase backdrop-blur-md">
                      {mem.category}
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">
                      {mem.key}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(mem)}
                          className="text-emerald-400 hover:text-emerald-300 p-1"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-white p-1"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(mem)}
                          className="text-slate-400 hover:text-cyan-400 p-1"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-cyan-500/50 bg-white/5 px-3 py-2 text-xs text-white backdrop-blur-md focus:outline-none"
                  />
                ) : (
                  <p className="mt-3 text-xs leading-relaxed text-slate-300 font-sans">
                    {mem.value}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-white/10 pt-2 text-[10px] text-slate-500">
                Last updated: {new Date(mem.updatedAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Memory */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0e1d]/90 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <BrainCircuit className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Add Persistent Memory</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="institute">Institute Information</option>
                  <option value="academic_preference">Academic & Exam Preferences</option>
                  <option value="formatting">Formatting & Bilingual Style</option>
                  <option value="workflow">Workflow & Automation</option>
                  <option value="custom">Custom Preference</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Memory Key (Identifier)
                </label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. default_chemistry_teacher, batch_name..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Value / Instruction Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter the exact instruction, text snippet, or preference..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  Save to JARVIS Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
