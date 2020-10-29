#!/usr/bin/env node
const yargs = require('yargs/yargs');
import defaults = require('./defaults');
import generate = require('./index');

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

  .describe('verbose', 'Print all generated msgs to stdout')
  .default('verbose', defaults.VERBOSE)

  .usage('ssb-fixtures [opts]').argv;

generate(argv);
