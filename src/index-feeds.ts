// SPDX-FileCopyrightText: 2021-2023 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT

import fs = require('fs');
import path = require('path');
import os = require('os');
import {FeedId} from 'ssb-typescript';
import util = require('util');
import {Ora} from 'ora';
const pify = util.promisify;
const rimraf = require('rimraf');
const pull = require('pull-stream');
const codec = require('flumecodec');
const Flume = require('flumedb');
const OffsetLog = require('flumelog-offset');
const {where, gt, toAsyncIter} = require('ssb-db2/operators');
const caps = require('ssb-caps');
const SecretStack = require('secret-stack');
const ssbKeys = require('ssb-keys');
const sleep = require('util').promisify(setTimeout);
import {Author} from './types';
import {paretoSample} from './sample';

function sampleAuthors(seed: string, authors: Array<Author>, total: number) {
  const sampled: Array<FeedId> = [];
  // Sample other authors, but don't sample ones that are already recipient
  while (sampled.length < total) {
    let other: FeedId;
    // Keep generating new `other` until `sampled` is filled-up with unique ids
    do {
      other = paretoSample(seed, authors).id;
    } while (sampled.some((r) => other === r));
    sampled.push(other);
  }
  return sampled
    .map((feedId) => authors.findIndex((author) => author.id === feedId))
    .filter((idx) => {
      if (idx < 0) throw new Error('sampleAuthors failed');
      else return true;
    });
}

function copyFlumelogOffset(origDir: string, destDir: string) {
  const flumeLogPath = path.join(origDir, 'flume', 'log.offset');
  fs.mkdirSync(path.join(destDir, 'flume'));
  fs.copyFileSync(flumeLogPath, path.join(destDir, 'flume', 'log.offset'));
}

function copySecret(origDir: string, destDir: string, i: number) {
  fs.copyFileSync(
    path.join(origDir, 'secret' + (i > 0 ? `-${i}` : '')),
    path.join(destDir, 'secret'),
  );
}

function startSbot(dir: string, seed: string) {
  const metafeedSeed = Buffer.from(
    ('metafeed:' + seed).slice(0, 32).padStart(32, '0'),
    'ascii',
  );
  return SecretStack({caps})
    .use(require('ssb-db2'))
    .use(require('ssb-bendy-butt'))
    .use(require('ssb-meta-feeds'))
    .use(require('ssb-index-feeds'))
    .call(null, {
      path: dir,
      keys: ssbKeys.loadOrCreateSync(path.join(dir, 'secret')),
      db2: {
        automigrate: true,
        dangerouslyKillFlumeWhenMigrated: true,
        _ssbFixtures: true,
      },
      metafeeds: {
        seed: metafeedSeed,
      },
    });
}

function migrateDone(sbot: any) {
  return new Promise((resolve, reject) => {
    pull(
      sbot.db2migrate.progress(),
      pull.filter((x: number) => x === 1),
      pull.take(1),
      pull.collect((err: any) => {
        if (err) reject(err);
        else resolve(void 0);
      }),
    );
  });
}

function openFlumedb(dir: string) {
  const flumeLogPath = path.join(dir, 'flume', 'log.offset');
  return Flume(OffsetLog(flumeLogPath, {codec: codec.json}));
}

function recentlyWrittenMsgs(timestamp: number, sbot: any) {
  return sbot.db.query(where(gt(timestamp, 'timestamp')), toAsyncIter());
}

function sanitizeMsg(msg: any) {
  if (msg.meta && msg.meta.originalContent) {
    msg.value.content = msg.meta.originalContent;
    delete msg.meta;
  }
  return msg;
}

export async function writeIndexFeeds(
  seed: string,
  indexFeedsPercentage: number,
  indexFeedTypes: string,
  authors: Array<Author>,
  spinner: Ora | null,
  outputDir: string,
) {
  spinner?.start('Generating index feeds');
  // Pick which authors will write indexFeeds
  const totalIndexAuthors = Math.round(
    (authors.length * indexFeedsPercentage) / 100,
  );
  const sampledAuthorIdxs = sampleAuthors(seed, authors, totalIndexAuthors);

  // For each picked author:
  for (let i = 1; i <= totalIndexAuthors; i++) {
    const idx = sampledAuthorIdxs[i - 1];
    if (spinner) {
      spinner.text = `Generating index feeds [setup] for author ${i} / ${totalIndexAuthors}`;
    }
    const lowestTimestamp = Date.now();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-feeds'));
    copyFlumelogOffset(outputDir, tempDir);
    copySecret(outputDir, tempDir, idx);
    const sbot = startSbot(tempDir, seed);
    await migrateDone(sbot);

    const author = authors[idx].id;
    for (let type of indexFeedTypes.split(',')) {
      if (spinner) {
        spinner.text = `Generating index feeds (${type}) for author ${i} / ${totalIndexAuthors}`;
      }
      if (type === 'private') {
        type = null as any;
        await pify(sbot.indexFeeds.start)({author, type, private: true});
      } else {
        await pify(sbot.indexFeeds.start)({author, type, private: false});
      }
    }
    await Promise.all(
      indexFeedTypes
        .split(',')
        .map((type) =>
          type === 'private'
            ? pify(sbot.indexFeeds.doneOld)({author, type: null, private: true})
            : pify(sbot.indexFeeds.doneOld)({author, type, private: false}),
        ),
    );

    const flumedb = openFlumedb(outputDir);
    for await (const msg of recentlyWrittenMsgs(lowestTimestamp, sbot)) {
      const flumeMsg = sanitizeMsg(msg);
      await pify(flumedb.append)(flumeMsg);
    }
    await pify(flumedb.close)();

    await sleep(500); // wait for indexes to be written properly
    await pify(sbot.close)();
    await sleep(500); // wait for indexes to be written properly
    rimraf.sync(tempDir);
  }

  spinner?.succeed(`Generated index feeds for ${totalIndexAuthors} authors`);
}
