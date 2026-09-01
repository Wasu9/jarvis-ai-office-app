import React from 'react';
import {AgentDefinition,TaskRecord} from '../types';
import OfficeSimulation3DGameV2 from './OfficeSimulation3DGameV2';
interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}

export const OfficeSimulation3DHyperReal:React.FC<Props>=({agents,activeTask})=>{
 const active=agents.filter(a=>a.enabled).length;
 return <aside className="float-right mb-4 ml-4 w-full overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#03080d] shadow-lg lg:w-[38%] xl:w-[40%]">
  <div className="flex items-center justify-between border-b border-white/10 bg-[#050b11]/95 px-3 py-2">
   <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">AI Office</div><div className="text-[8px] text-slate-500">Fixed Top View · {active} AI employees</div></div>
   <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-bold text-emerald-300">LIVE</div>
  </div>
  <div className="h-[280px] w-full sm:h-[320px] lg:h-[330px] xl:h-[350px]">
   <OfficeSimulation3DGameV2 agents={agents} activeTask={activeTask}/>
  </div>
  <div className="border-t border-white/10 bg-[#050b11] px-3 py-1.5 text-center text-[7px] text-slate-600">Scroll / pinch to zoom</div>
 </aside>;
};
export default OfficeSimulation3DHyperReal;
