import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  GraduationCap,
  FileText,
  BookOpenCheck,
  Share2,
  Megaphone,
  Clapperboard,
  Bot,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  HelpCircle,
  Code2,
} from 'lucide-react';
import { AgentCapability, AgentDefinition } from '../types';
import { ApiService } from '../services/api';

interface AgentManagerProps {
  agents: AgentDefinition[];
  onSelectAgent: (agentId: string) => void;
  onRefreshAgents: () => void;
  onUsePrompt: (prompt: string, agentId: string) => void;
}

export const AgentManager: React.FC<AgentManagerProps> = ({
  agents,
  onSelectAgent,
  onRefreshAgents,
  onUsePrompt,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'academic' | 'media' | 'admin' | 'custom'>('all');

  // Form State for New Custom Agent
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentCapabilities, setNewAgentCapabilities] = useState<AgentCapability[]>(['custom']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const getAgentIcon = (name: string) => {
    switch (name) {
      case 'GraduationCap':
        return <GraduationCap className="h-5 w-5 text-cyan-400" />;
      case 'FileText':
        return <FileText className="h-5 w-5 text-blue-400" />;
      case 'BookOpenCheck':
        return <BookOpenCheck className="h-5 w-5 text-emerald-400" />;
      case 'Share2':
        return <Share2 className="h-5 w-5 text-pink-400" />;
      case 'Megaphone':
        return <Megaphone className="h-5 w-5 text-amber-400" />;
      case 'Clapperboard':
        return <Clapperboard className="h-5 w-5 text-purple-400" />;
      default:
        return <Bot className="h-5 w-5 text-cyan-400" />;
    }
  };

  const handleToggleAgent = async (agent: AgentDefinition) => {
    try {
      await ApiService.updateAgent(agent.id, { enabled: !agent.enabled });
      onRefreshAgents();
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this custom agent?')) return;
    try {
      await ApiService.deleteAgent(agentId);
      onRefreshAgents();
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentPrompt.trim()) {
      setFormError('Agent Name and System Instructions are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await ApiService.createAgent({
        name: newAgentName,
        description: newAgentDesc || 'Custom Autonomous AI Agent',
        systemPrompt: newAgentPrompt,
        capabilities: newAgentCapabilities,
        inputRequirements: ['User text', 'Optional documents'],
        outputTypes: ['markdown', 'docx'],
        iconName: 'Bot',
      });

      setShowCreateModal(false);
      setNewAgentName('');
      setNewAgentDesc('');
      setNewAgentPrompt('');
      onRefreshAgents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAgents = agents.filter((a) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'custom') return a.isCustom;
    return a.category === filterCategory;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white tracking-tight sm:text-2xl">
              JARVIS Agent Registry & Manager
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
            Modular AI workforce for educational institutions. Use specialized built-in agents or create custom employees for your academy.
          </p>
        </div>

        <button
          id="btn-create-agent"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Agent</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {(['all', 'academic', 'media', 'admin', 'custom'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              filterCategory === cat
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white backdrop-blur-md'
            }`}
          >
            {cat === 'all' ? 'All Agents' : cat}
          </button>
        ))}
      </div>

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className={`relative flex flex-col justify-between rounded-3xl border p-5 backdrop-blur-xl transition-all shadow-xl ${
              agent.enabled
                ? 'border-white/10 bg-white/5 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'border-white/5 bg-white/5 opacity-50'
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                    {getAgentIcon(agent.iconName)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                    <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                      {agent.shortCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleAgent(agent)}
                    title={agent.enabled ? 'Disable Agent' : 'Enable Agent'}
                    className="text-slate-400 hover:text-cyan-400 p-1"
                  >
                    {agent.enabled ? (
                      <ToggleRight className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-600" />
                    )}
                  </button>

                  {agent.isCustom && (
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      title="Delete Agent"
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="mt-3.5 text-xs leading-relaxed text-slate-300">
                {agent.description}
              </p>

              {/* Capabilities & Formats */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300 backdrop-blur-md"
                  >
                    {cap.replace('_', ' ')}
                  </span>
                ))}
                {agent.outputTypes.map((fmt, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400 uppercase backdrop-blur-md"
                  >
                    .{fmt}
                  </span>
                ))}
              </div>

              {/* Sample Prompts */}
              {agent.samplePrompts && agent.samplePrompts.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sample Command:
                  </span>
                  <p
                    onClick={() => onUsePrompt(agent.samplePrompts[0], agent.id)}
                    className="mt-1 cursor-pointer rounded-xl bg-white/5 p-2.5 text-[11px] italic text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 border border-white/10 backdrop-blur-md"
                  >
                    "{agent.samplePrompts[0]}"
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Use Agent Action */}
            <div className="mt-5 border-t border-white/10 pt-3.5">
              <button
                onClick={() => onSelectAgent(agent.id)}
                className="flex w-full items-center justify-center space-x-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span>Launch Assistant with this Agent</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create New Agent (Frosted Glass) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c0e1d]/90 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <Bot className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Create Custom AI Agent</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Agent Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Chemistry Formula Sheet Agent, Fee Reminder Agent..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Description
                </label>
                <input
                  type="text"
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="Briefly describe what this agent does..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  System Instructions & Prompt <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Define detailed persona, rules, formatting requirements, and steps for this agent..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering Agent...' : 'Save & Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
