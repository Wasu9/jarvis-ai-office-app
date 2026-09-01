import React from'react';
import{OfficeSimulation3DGame}from'./OfficeSimulation3DGame';
import{AgentDefinition,TaskRecord}from'../types';
interface Props{agents:AgentDefinition[];activeTask:TaskRecord|null}
/** Game-quality procedural 3D office. Uses Three.js geometry only; no generated image. */
export const OfficeSimulation3DHyperReal:React.FC<Props>=(props)=><OfficeSimulation3DGame {...props}/>;
export default OfficeSimulation3DHyperReal;
