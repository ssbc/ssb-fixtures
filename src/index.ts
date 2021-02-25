import pify = require('promisify-4loc');
import {ContactContent, Msg} from 'ssb-typescript';
import {makeSSB} from './ssb';
import {generateAuthors, generateMsgOrContent} from './generate';
import {Opts, MsgsByType, Follows, Blocks, Peer} from './types';
import {paretoSample} from './sample';
import slimify from './slimify';
import writeReportFile from './report';
import * as defaults from './defaults';
import fs = require('fs');
import path = require('path');
const mkdirp = require('mkdirp');
const TestBot = require('scuttle-testbot');
const __ts = require('monotonic-timestamp');

function* range(start: number, end: number) {
  if (start > end) return;
  let i = start;
  while (i <= end) {
    yield i;
    i++;
  }
}

function saveSecret(
  keys: unknown | undefined,
  outputDir: string,
  filename: string = 'secret',
) {
  if (!keys) return;
  mkdirp.sync(outputDir);
  const filePath = path.join(outputDir, filename);
  const fileContent = JSON.stringify(keys, null, 2);
  fs.writeFileSync(filePath, fileContent, {encoding: 'utf-8'});
}

export = async function generateFixture(opts?: Partial<Opts>) {
  const outputDir = opts?.outputDir ?? defaults.outputDir();
  const numMessages = Math.max(opts?.messages ?? defaults.MESSAGES, 1);
  const numAuthors = Math.max(opts?.authors ?? defaults.AUTHORS, 1);
  const seed = opts?.seed ?? defaults.randomSeed();
  const slim = opts?.slim ?? defaults.SLIM;
  const report = opts?.report ?? defaults.REPORT;
  const latestmsg = (opts?.latestmsg ?? numMessages) - 1;
  const verbose = opts?.verbose ?? defaults.VERBOSE;

  const authorsKeys = generateAuthors(seed, numAuthors);

  const mainKeys = authorsKeys[0];
  const othersKeys = authorsKeys.slice(1);

  saveSecret(mainKeys, outputDir, 'secret');
  saveSecret(othersKeys[0], outputDir, 'secret-b');
  saveSecret(othersKeys[1], outputDir, 'secret-c');

  const mainPeer: Peer = makeSSB(mainKeys, outputDir);
  const otherPeers: Array<Peer> = othersKeys.map((keys) => makeSSB(keys));
  const peers = [mainPeer, ...otherPeers];
  const msgs: Array<Msg> = [];
  const msgsByType: MsgsByType = {};
  const peersById = new Map(peers.map((p) => [p.id, p]));

  const follows: Follows = new Map(peers.map((a) => [a.id, new Set()]));
  const blocks: Blocks = new Map(peers.map((a) => [a.id, new Set()]));
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
    // OLDESTMSG and LATESTMSG are always authored by the main peer
    const peer =
      i === 0 || i === latestmsg ? mainPeer : paretoSample(seed, peers);
    const [msgOrContent, replicatePeersIds] = await generateMsgOrContent(
      seed,
      i,
      latestmsg,
      peer,
      msgsByType,
      peers,
      follows,
      blocks,
    );
    const maybeMsg = msgOrContent as Partial<Msg>;
    const posted: Msg =
      maybeMsg?.key && maybeMsg?.timestamp && maybeMsg?.value
        ? maybeMsg!
        : await pify<any>(peer.publish)(msgOrContent);

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

    // Replicate from `peer` to other relevant peers that might need
    // this newly created message
    if (replicatePeersIds?.length) {
      const replicatePeers = replicatePeersIds.map((id) => peersById.get(id)!);
      for (const otherPeer of replicatePeers) {
        await pify(TestBot.replicate)({from: peer, to: otherPeer});
      }
    }
  }

  // Replicate from other peers to mainPeer
  //
  // We need the replication timestamps (`msg.key`) to be deterministic
  // so we're resetting the timestamp generator to a date which is
  // likely/HOPEFULLY larger than any given `msg.value.timestamp`
  __ts?.reset?.(defaults.REPLICATION_TIMESTAMP);
  for (const otherPeer of otherPeers) {
    await pify(TestBot.replicate)({from: otherPeer, to: mainPeer});
  }

  if (report) writeReportFile(msgs, msgsByType, peers, follows, outputDir);

  await Promise.all(peers.map((peer) => pify<unknown>(peer.close)()));

  if (slim) slimify(outputDir);
};
