// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT

import fs = require('fs');
import path = require('path');
import pify = require('promisify-4loc');
import {ContactContent, FeedId, Msg} from 'ssb-typescript';
import ora = require('ora');
import {makeSSB} from './ssb';
import {generateAuthors, generateMsgContent} from './generate';
import {Opts, MsgsByType, Follows, Blocks} from './types';
import {paretoSample, reset as resetRNG} from './sample';
import slimify from './slimify';
import writeReportFile from './report';
import * as defaults from './defaults';
import {writeIndexFeeds} from './index-feeds';

function* range(start: number, end: number) {
  if (start > end) return;
  let i = start;
  while (i <= end) {
    yield i;
    i++;
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err, origin) => {
  console.error('Uncaught Exception at ', origin, ':', err);
  process.exit(1);
});

export = async function generateFixture(opts?: Partial<Opts>) {
  const outputDir = opts?.outputDir ?? defaults.outputDir();
  const numMessages = Math.max(opts?.messages ?? defaults.MESSAGES, 1);
  const numAuthors = Math.max(opts?.authors ?? defaults.AUTHORS, 1);
  const seed = opts?.seed ?? defaults.randomSeed();
  const slim = opts?.slim ?? defaults.SLIM;
  const allkeys = opts?.allkeys ?? defaults.ALL_KEYS;
  const followGraph = opts?.followGraph ?? defaults.FOLLOW_GRAPH;
  const report = opts?.report ?? defaults.REPORT;
  const latestmsg = (opts?.latestmsg ?? numMessages) - 1;
  const indexFeedsPercentage = opts?.indexFeeds ?? defaults.INDEX_FEEDS;
  const indexFeedTypes = opts?.indexFeedTypes ?? defaults.INDEX_FEED_TYPES;
  const verbose = opts?.verbose ?? defaults.VERBOSE;
  const progress = opts?.progress ?? defaults.PROGRESS;

  resetRNG();

  const spinner = progress ? ora('Setting up').start() : null;
  const authorsKeys = generateAuthors(seed, numAuthors);
  const ssb = makeSSB(authorsKeys, outputDir, followGraph);

  const msgs: Array<Msg> = [];
  const msgsByType: MsgsByType = {};
  const authors = authorsKeys.map((keys) => ssb.createFeed(keys));

  const follows: Follows = new Map(authors.map((a) => [a.id, new Set()]));
  const blocks: Blocks = new Map(authors.map((a) => [a.id, new Set()]));
  function updateFollowsAndBlocks(msg: Msg<ContactContent>) {
    const authorFollows = follows.get(msg.value.author)!;
    if (msg.value.content.following === true) {
      authorFollows.add(msg.value.content.contact!);
    } else if (msg.value.content.following === false) {
      authorFollows.delete(msg.value.content.contact!);
    }
    const authorBlocks = blocks.get(msg.value.author)!;
    if (msg.value.content.blocking === true) {
      authorBlocks.add(msg.value.content.contact!);
    } else if (msg.value.content.blocking === false) {
      authorBlocks.delete(msg.value.content.contact!);
    }
  }

  for (let i of range(0, numMessages - 1)) {
    if (spinner) spinner.text = `Generating msg ${i + 1} / ${numMessages}`;
    let author = paretoSample(seed, authors);
    // OLDESTMSG and LATESTMSG are always authored by database owner
    if (i === 0 || i === latestmsg) author = authors[0];
    const content = await generateMsgContent(
      ssb,
      seed,
      i,
      latestmsg,
      author,
      msgsByType,
      authors,
      follows,
      blocks,
    );
    const posted: Msg = await pify<any>(author.add)(content);

    if (posted?.value.content) {
      msgs.push(posted);
      if (typeof posted.value.content === 'string') {
        msgsByType['private'] ??= [];
        msgsByType['private']!.push(posted);
      } else {
        msgsByType[posted.value.content.type!] ??= [];
        msgsByType[posted.value.content.type!]!.push(posted);
        if (posted.value.content.type === 'contact') {
          updateFollowsAndBlocks(posted as Msg<ContactContent>);
        }
      }
      if (verbose) {
        console.log(`${JSON.stringify(posted, null, 2)}\n`);
      }
    }
  }
  spinner?.succeed(`Generated ${numMessages} messages`);

  if (report) writeReportFile(msgs, msgsByType, authors, follows, outputDir);

  let graph: Record<FeedId, Record<FeedId, boolean | null>> | undefined;
  if (followGraph) {
    spinner?.start('Generating follow graph');
    graph = (await pify(ssb.friends.graph)()) as any;
    // Convert from new style (numbers) to old style (boolean/null)
    for (const source of Object.keys(graph!)) {
      for (const dest of Object.keys(graph![source])) {
        const num = graph![source][dest] as any as number;
        if (num === 1) graph![source][dest] = true;
        else if (num === -1) graph![source][dest] = false;
        else if (num < -1) graph![source][dest] = null;
      }
    }
    const graphFilepath = path.join(outputDir, 'follow-graph.json');
    const graphJSON = JSON.stringify(graph, null, 2);
    await fs.promises.writeFile(graphFilepath, graphJSON, {encoding: 'utf-8'});
    spinner?.succeed('Generated follow graph');
  }

  await pify<unknown>(ssb.close)();

  if (indexFeedsPercentage) {
    await writeIndexFeeds(
      seed,
      indexFeedsPercentage,
      indexFeedTypes,
      authors,
      spinner,
      outputDir,
    );
  }

  if (slim) slimify(authors.length, outputDir, allkeys);
};
