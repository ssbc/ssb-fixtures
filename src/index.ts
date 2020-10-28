import path = require('path');
import run = require('promisify-tuple');
import {ContactContent, Msg} from 'ssb-typescript';
import {makeSSB} from './ssb';
import {generateRandomSeed, generateAuthors, generateMsg} from './generate';
import {Opts, MsgsByType, Follows, Blocks} from './types';
import {paretoSample} from './sample';
import slimify from './slimify';
import writeReportFile from './report';

function* range(start: number, end: number) {
  if (start > end) return;
  let i = start;
  while (i <= end) {
    yield i;
    i++;
  }
}

export = async function generateFixture(opts?: Partial<Opts>) {
  const outputDir = opts?.outputDir ?? path.join(process.cwd(), 'data');
  const numMessages = Math.max(opts?.messages ?? 1e4, 1);
  const numAuthors = Math.max(opts?.authors ?? 150, 1);
  const seed = opts?.seed ?? generateRandomSeed();
  const slim = opts?.slim ?? true;
  const report = opts?.report ?? true;
  const latestmsg = (opts?.latestmsg ?? numMessages) - 1;

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
    var [err, posted]: [any, Msg?] = await run<any>(author.add)(
      generateMsg(
        seed,
        i,
        latestmsg,
        author,
        msgsByType,
        authors,
        follows,
        blocks,
      ),
    );

    if (err) {
      console.error(err);
      process.exit(1);
    } else if (posted?.value.content) {
      msgs.push(posted);
      msgsByType[posted.value.content.type!] ??= [];
      msgsByType[posted.value.content.type!]!.push(posted);
      if (posted.value.content.type === 'contact') {
        updateFollowsAndBlocks(posted as Msg<ContactContent>);
      }
      // console.log(`${JSON.stringify(posted, null, 2)}\n`);
    }
  }

  if (report) writeReportFile(msgs, msgsByType, authors, follows, outputDir);

  await run<unknown>(ssb.close)();

  if (slim) slimify(outputDir);
};
