import React from 'react';
import { OfficeSimulation3DPresentation } from './OfficeSimulation3DPresentation';
import { AgentDefinition, TaskRecord } from '../types';

interface Props {
  agents: AgentDefinition[];
  activeTask: TaskRecord | null;
}

/** Stable real-time 3D office with a production-safe miniature presentation layer. */
export const OfficeSimulation3DHyperReal: React.FC<Props> = (props) => (
  <OfficeSimulation3DPresentation {...props} />
);

export default OfficeSimulation3DHyperReal;
