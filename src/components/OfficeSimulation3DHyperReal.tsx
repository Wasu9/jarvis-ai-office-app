import React from 'react';
import { OfficeSimulation3D } from './OfficeSimulation3D';

/**
 * Stable hyper-real office entry point.
 * The production renderer lives in OfficeSimulation3D; this alias keeps the
 * hyper-real component contract without introducing a second fragile renderer.
 */
export const OfficeSimulation3DHyperReal = OfficeSimulation3D;
export default OfficeSimulation3DHyperReal;
