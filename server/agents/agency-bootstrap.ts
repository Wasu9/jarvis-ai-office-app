import { agentRegistry } from './definitions.js';
import { AGENCY_LIBRARY_AGENTS } from './agency-library.js';

/**
 * Install curated Agency Agents into JARVIS without replacing the existing
 * built-in agents or changing the AgentRegistry implementation.
 *
 * The registry's customAgents map is intentionally private, so we expose the
 * library through small instance-level wrappers. This also makes the
 * integration deterministic in bundled/serverless builds.
 */
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
