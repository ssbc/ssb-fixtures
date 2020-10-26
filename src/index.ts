import {ContactContent, Msg} from 'ssb-typescript';
import run = require('promisify-tuple');
import os = require('os');
import fs = require('fs');
import path = require('path');
import generateMsg from './generate';
import {Opts, MsgsByType, Follows, Blocks} from './types';
import {paretoSample} from './sample';
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const ssbKeys = require('ssb-keys');
const SecretStack = require('secret-stack');
const makeConfig = require('ssb-config/inject');

function* range(start: number, end: number) {
  if (start > end) return;
  let i = start;
  while (i <= end) {
    yield i;
    i++;
  }
}

function slimify(outputDir: string) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssb-fixture-gen-'));
  const preserved = ['secret', 'flume/log.offset'];
  for (let p of preserved) {
    mkdirp.sync(path.dirname(path.join(tmpDir, p)));
    fs.copyFileSync(path.join(outputDir, p), path.join(tmpDir, p));
  }
  rimraf.sync(outputDir);
  fs.mkdirSync(outputDir);
  for (let p of preserved) {
    mkdirp.sync(path.dirname(path.join(outputDir, p)));
    fs.copyFileSync(path.join(tmpDir, p), path.join(outputDir, p));
  }
}

export = async function generateFixture(opts?: Partial<Opts>) {
  const outputDir = opts?.outputDir ?? path.join(process.cwd(), 'data');
  const numMessages = Math.max(opts?.messages ?? 1e4, 1);
  const numAuthors = Math.max(opts?.authors ?? 150, 1);
  const slim = opts?.slim ?? true;

  const peer = SecretStack({appKey: require('ssb-caps').shs})
    .use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-db'))
    .call(
      null,
      makeConfig('ssb', {
        path: outputDir,
        logging: {
          level: 'info',
        },
        connections: {
          incoming: {},
          outgoing: {},
        },
      }),
    );

  const msgsByType: MsgsByType = {};
  const authors = Array.from(range(1, numAuthors))
    .map((_, i) => (i === 0 ? peer.keys : ssbKeys.generate()))
    .map((keys) => peer.createFeed(keys));

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
    const author = paretoSample(authors);
    var [err, posted]: [any, Msg?] = await run<any>(author.add)(
      generateMsg(i, numMessages, author, msgsByType, authors, follows, blocks),
    );

    if (err) {
      console.error(err);
      process.exit(1);
    } else if (posted?.value.content) {
      msgsByType[posted.value.content.type!] ??= [];
      msgsByType[posted.value.content.type!]!.push(posted);
      if (posted.value.content.type === 'contact') {
        updateFollowsAndBlocks(posted as Msg<ContactContent>);
      }
      console.log(`${JSON.stringify(posted, null, 2)}\n`);
    }
  }

  peer.close(() => {
    if (slim) {
      slimify(outputDir);
    }
  });
};
