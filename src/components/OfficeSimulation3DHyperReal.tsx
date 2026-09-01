import React from'react';
import{OfficeSimulation3DGameV2}from'./OfficeSimulation3DGameV2';
import{AgentDefinition,TaskRecord}from'../types';
interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}
/** Game-like procedural 3D office with third-person movement and animated NPC employees. */
export const OfficeSimulation3DHyperReal:React.FC<Props>=(props)=><OfficeSimulation3DGameV2 {...props}/>;
export default OfficeSimulation3DHyperReal;
