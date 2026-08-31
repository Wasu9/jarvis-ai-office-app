import React from 'react';
import { OfficeSimulation3DRealistic } from './OfficeSimulation3DRealistic';
import { AgentDefinition, TaskRecord } from '../types';

interface Props { agents: AgentDefinition[]; activeTask: TaskRecord | null; }

/** Real Three.js miniature-office renderer. No generated image is used. */
export const OfficeSimulation3DHyperReal: React.FC<Props> = (props) => (
  <OfficeSimulation3DRealistic {...props} />
);

export default OfficeSimulation3DHyperReal;
