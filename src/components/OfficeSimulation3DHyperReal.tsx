import React from'react';
import {AgentDefinition,TaskRecord}from'../types';
import OfficeSimulation3DGameV2 from'./OfficeSimulation3DGameV2';
interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}

export const OfficeSimulation3DHyperReal:React.FC<Props>=({agents,activeTask})=>{
 const active=agents.filter(a=>a.enabled).length;
 return <div className="relative mx-auto w-full max-w-[1700px] overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#03080d] shadow-[0_20px_80px_rgba(0,0,0,.45)]">
  <div className="flex items-center justify-between border-b border-white/10 bg-[#050b11]/95 px-4 py-3">
   <div><div className="text-sm font-black text-white">SHAHEEN <span className="text-cyan-300">AI OFFICE</span> <span className="ml-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[8px] text-emerald-300">LIVE</span></div><div className="text-[9px] text-slate-500">Fixed Top View · {active} AI employees · {activeTask?'1 active mission':'Ready'}</div></div>
   <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-3 py-2 text-[9px] font-bold text-cyan-200">SCROLL / PINCH · ZOOM</div>
  </div>
  <OfficeSimulation3DGameV2 agents={agents} activeTask={activeTask}/>
 </div>;
};
export default OfficeSimulation3DHyperReal;
