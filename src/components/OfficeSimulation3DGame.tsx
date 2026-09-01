import React from 'react';
import {OfficeSimulation3DGameV2} from './OfficeSimulation3DGameV2';
import {MobileGameControls} from './MobileGameControls';

export const OfficeSimulation3DGame:React.FC<React.ComponentProps<typeof OfficeSimulation3DGameV2>>=(props)=><div className="relative w-full">
  <OfficeSimulation3DGameV2 {...props}/>
  <MobileGameControls/>
</div>;

export default OfficeSimulation3DGame;
