#!/usr/bin/env node

// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: Unlicense

var pkg = require('../package.json');
console.log(pkg.version.replace(/\..*/g, ''));
