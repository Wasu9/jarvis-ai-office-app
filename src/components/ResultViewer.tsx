import React from 'react';
import { ResultViewerFixed } from './ResultViewerFixed';
import { TaskRecord } from '../types';

export const ResultViewer: React.FC<{task: TaskRecord; onRepeat?: () => void}> = ({ task, onRepeat }) => (
  <ResultViewerFixed task={task} onRepeat={onRepeat} />
);
