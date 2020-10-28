import {generateRandomSeed} from './generate';
import path = require('path');

export const MESSAGES = 1e4;
export const AUTHORS = 150;
export const SLIM = true;
export const REPORT = true;
export const randomSeed = generateRandomSeed;
export const outputDir = () => path.join(process.cwd(), 'data');
