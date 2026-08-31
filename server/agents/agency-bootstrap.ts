import { agentRegistry } from './definitions.js';
import { AGENCY_LIBRARY_AGENTS } from './agency-library.js';

// Install curated upstream agent adapters into JARVIS's native registry once.
for (const agent of AGENCY_LIBRARY_AGENTS) {
  if (!agentRegistry.getAgent(agent.id)) {
    agentRegistry.addCustomAgent(agent);
  }
}
