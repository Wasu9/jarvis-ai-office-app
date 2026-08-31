import React from 'react';
import { OfficeSimulation3D } from './OfficeSimulation3D';
import { AgentDefinition, TaskRecord } from '../types';

interface Props {
  agents: AgentDefinition[];
  activeTask: TaskRecord | null;
}

/**
 * Production-safe presentation layer for the existing real-time Three.js office.
 * It intentionally does not replace or mutate the stable renderer.
 */
export const OfficeSimulation3DPresentation: React.FC<Props> = ({ agents, activeTask }) => {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-cyan-300/10 bg-[#050b10] shadow-[0_24px_70px_rgba(0,0,0,.55)]"
      style={{ perspective: '1200px' }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[24px]"
        style={{
          boxShadow: 'inset 0 0 90px rgba(0,0,0,.42), inset 0 0 1px rgba(130,240,255,.35)',
          background:
            'radial-gradient(circle at 50% 35%, transparent 0%, transparent 58%, rgba(0,0,0,.32) 100%)',
        }}
      />
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-cyan-200/15 bg-black/45 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.18em] text-cyan-100/70 backdrop-blur-md">
        LIVE · REAL-TIME 3D · MINIATURE OFFICE
      </div>
      <div className="relative z-0 min-h-[360px] sm:min-h-[430px]">
        <OfficeSimulation3D agents={agents} activeTask={activeTask} />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-between text-[7px] uppercase tracking-[.16em] text-slate-500">
        <span>{agents.length} AI EMPLOYEES</span>
        <span>{activeTask ? `MISSION · ${activeTask.status}` : 'OFFICE READY'}</span>
      </div>
    </div>
  );
};

export default OfficeSimulation3DPresentation;
