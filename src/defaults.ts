// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT

import {generateRandomSeed} from './generate';
import path = require('path');

export const MESSAGES = 1e4;
export const AUTHORS = 150;
export const SLIM = true;
export const ALL_KEYS = false;
export const FOLLOW_GRAPH = false;
export const REPORT = true;
export const VERBOSE = false;
export const PROGRESS = false;
export const INDEX_FEEDS = 0;
export const INDEX_FEED_TYPES = 'about,contact';
export const randomSeed = generateRandomSeed;
export const outputDir = () => path.join(process.cwd(), 'data');
