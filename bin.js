#!/usr/bin/env node
const yargs = require('yargs/yargs');
const defaults = require('./lib/defaults');
const generate = require('./lib/index');

const argv = yargs(process.argv)
  .describe('seed', 'String for deterministic generation')

  .describe('messages', 'Num of msgs to generate')
  .default('messages', defaults.MESSAGES)

  .describe('authors', 'Num of feeds to generate')
  .default('authors', defaults.AUTHORS)

  .describe('outputDir', 'Directory for the output fixture')
  .default('outputDir', defaults.outputDir, './data')

  .describe('slim', 'Keep only essential flume files in the fixture')
  .default('slim', defaults.SLIM)

  .describe('report', 'Create a report.md file in the fixture')
  .default('report', defaults.REPORT)

  .describe('latestmsg', '1-based index position of the LATESTMSG')

  .usage('ssb-fixtures [opts]').argv;

generate(argv);
