import { agentRegistry } from './definitions.js';
import { AGENCY_LIBRARY_AGENTS } from './agency-library.js';
import { loadCustomAgents } from '../persistence.js';

/**
 * Bootstrap curated agency agents plus user-created local agents.
 * User-created agents are persisted for the local zero-cost deployment;
 * persistence failure must never prevent the server from starting.
 */
for (const saved of loadCustomAgents()) {
  try {
    if (saved.id && !saved.id.startsWith('agency-')) agentRegistry.addCustomAgent(saved as any);
  } catch (error) {
    console.warn('[JARVIS] Could not restore custom agent:', saved.id, error);
  }
}

const originalGetAllAgents = agentRegistry.getAllAgents.bind(agentRegistry);
const originalGetAgent = agentRegistry.getAgent.bind(agentRegistry);
const agencyById = new Map(AGENCY_LIBRARY_AGENTS.map((agent) => [agent.id, agent]));

agentRegistry.getAllAgents = () => [
  ...originalGetAllAgents(),
  ...AGENCY_LIBRARY_AGENTS.filter((agent) => !originalGetAgent(agent.id)),
];

agentRegistry.getAgent = (id: string) => {
  return agencyById.get(id) ?? originalGetAgent(id);
};
