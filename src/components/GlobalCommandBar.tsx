import React from 'react';
import { AttachedFile, JarvisSettings, TaskRecord } from '../types';

interface Props {
  settings: JarvisSettings;
  selectedAgentId: string;
  setActiveTask: (task: TaskRecord | null) => void;
  onTaskCompleted: (task: TaskRecord) => void;
  onAgentHired?: () => void;
}

// Kept as a compatibility shim. The assistant owns the single command composer.
// This prevents a second attachment/input surface from being rendered.
export const GlobalCommandBar: React.FC<Props> = () => null;
