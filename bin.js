#!/usr/bin/env node
const yargs = require('yargs/yargs');
const argv = yargs(process.argv)
  .describe('seed', 'String for deterministic generation')
  .describe('messages', 'Num of msgs to generate')
  .describe('authors', 'Num of feeds to generate')
  .describe('outputDir', 'Directory for the output fixture')
  .describe('slim', 'Keep only essential flume files in the fixture')
  .describe('report', 'Create a report.md file in the fixture')
  .describe('latestmsg', '1-based index position of the LATESTMSG')
  .usage('ssb-fixtures [opts]').argv;
const generate = require('./lib/index');

generate(argv);
