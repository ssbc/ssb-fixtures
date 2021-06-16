import pify = require('promisify-4loc');
import {ContactContent, Msg} from 'ssb-typescript';
import {makeSSB} from './ssb';
import {generateAuthors, generateMsgContent} from './generate';
import {Opts, MsgsByType, Follows, Blocks} from './types';
import {paretoSample} from './sample';
import slimify from './slimify';
import writeReportFile from './report';
import * as defaults from './defaults';

function* range(start: number, end: number) {
  if (start > end) return;
  let i = start;
  while (i <= end) {
    yield i;
    i++;
  }
}

export = async function generateFixture(opts?: Partial<Opts>) {
  const outputDir = opts?.outputDir ?? defaults.outputDir();
  const numMessages = Math.max(opts?.messages ?? defaults.MESSAGES, 1);
  const numAuthors = Math.max(opts?.authors ?? defaults.AUTHORS, 1);
  const seed = opts?.seed ?? defaults.randomSeed();
  const slim = opts?.slim ?? defaults.SLIM;
  const allkeys = opts?.allkeys ?? defaults.ALL_KEYS;
  const report = opts?.report ?? defaults.REPORT;
  const latestmsg = (opts?.latestmsg ?? numMessages) - 1;
  const verbose = opts?.verbose ?? defaults.VERBOSE;

  const authorsKeys = generateAuthors(seed, numAuthors);
  const ssb = makeSSB(authorsKeys, outputDir);

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

  if (report) writeReportFile(msgs, msgsByType, authors, follows, outputDir);

  await pify<unknown>(ssb.close)();

  if (slim) slimify(authors.length, outputDir, allkeys);
};
