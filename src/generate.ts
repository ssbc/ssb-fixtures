import pify = require('promisify-4loc');
import crypto = require('crypto');
const ssbKeys = require('ssb-keys');
import {LoremIpsum} from 'lorem-ipsum';
import {
  AboutContent,
  ContactContent,
  Content,
  FeedId,
  Msg,
  PostContent,
  Privatable,
  VoteContent,
} from 'ssb-typescript';
import freq = require('./frequencies');
import {
  paretoSample,
  paretoSampleMany,
  uniformSample,
  randomInt,
  sampleCollection,
  somewhatGaussian,
  random,
} from './sample';
import {Peer, Blocks, Follows, MsgsByType} from './types';
import util = require('util');
const sleep = util.promisify(setTimeout);

let __lorem: any;

export function generateRandomSeed() {
  return crypto
    .randomBytes(64)
    .toString('ascii')
    .replace(/\W/g, '')
    .substr(0, 24);
}

function generateBlobId() {
  const blob = Buffer.alloc(32);
  Buffer.from(__lorem.generateWords(9).replace(/\W/g, ''), 'utf-8').copy(blob);
  return '&' + blob.toString('base64') + '.sha256';
}

function generateMentions(seed: string, peers: Array<Peer>) {
  return Array.from({length: randomInt(seed, 1, 4)}, () => {
    const mentionType = sampleCollection(seed, freq.MENTION_LINK_FREQUENCIES);
    if (mentionType === 'author') {
      const peer = paretoSample(seed, peers);
      return {
        link: peer.id,
        name: __lorem.generateWords(randomInt(seed, 1, 3)),
      };
    } else if (mentionType === 'blob') {
      return {
        link: generateBlobId(),
        type: sampleCollection(seed, freq.BLOB_TYPE_FREQUENCIES),
        size: Math.round(somewhatGaussian(seed) * 2e6),
        ...(random(seed) < freq.MENTION_BLOB_NAME_FREQUENCY
          ? {
              name: __lorem.generateWords(randomInt(seed, 1, 3)),
            }
          : {}),
      };
    } else if (mentionType === 'channel') {
      return {link: '#' + __lorem.generateWords(1)};
    }
  });
}

function generateRecipients(
  seed: string,
  peer: Peer,
  peers: Array<Peer>,
): Required<Privatable<{}>>['recps'] {
  return paretoSampleMany(
    seed,
    peers.map((a) => a.id),
    randomInt(seed, 1, 7),
    [peer.id], // Always include author
  );
}

function generatePostContent(
  seed: string,
  i: number,
  latestmsg: number,
  msgsByType: MsgsByType,
  peers: Array<Peer>,
  type: 'private' | 'post' = 'post',
): PostContent {
  const textSize = sampleCollection(seed, freq.POST_SIZE_FREQUENCIES);
  // Text
  const content: PostContent = {
    type: 'post',
    text:
      textSize === 'short'
        ? __lorem.generateWords(randomInt(seed, 1, 5))
        : textSize === 'medium'
        ? __lorem.generateSentences(randomInt(seed, 1, 5))
        : __lorem.generateParagraphs(randomInt(seed, 1, 5)),
  };
  // OLDESTMSG and LATESTMSG markers
  if (i === 0) {
    content.text = 'OLDESTMSG ' + content.text;
  }
  if (i === latestmsg) {
    content.text = 'LATESTMSG ' + content.text;
  }
  // Channel
  if (random(seed) < freq.POST_CHANNEL_FREQUENCY) {
    content.channel = __lorem.generateWords(1);
  }
  // Replies
  if (
    type !== 'private' && // Private msg should not reply to `other` public msg
    i < latestmsg && // Don't make the last msg a reply, it should be root
    (msgsByType.post?.length ?? 0) >= 2 && // Only reply if there are other post
    random(seed) < freq.POST_REPLY_FREQUENCY
  ) {
    const min = 1; // avoid 0, to never reply to the OLDESTMSG
    const other = paretoSample(
      seed,
      msgsByType.post!,
      1.6,
      min,
    ) as Msg<PostContent>;
    if (other.value.content?.root) {
      if (random(seed) < freq.POST_REPLY_FORK_FREQUENCY) {
        content.root = other.key;
        content.branch = other.key;
        (content as any).fork = other.value.content.root;
      } else {
        content.root = other.value.content.root;
        content.branch = other.key;
      }
    } else {
      content.root = other.key;
      content.branch = other.key;
    }
  }
  // Mentions
  if (random(seed) < freq.POST_MENTIONS_FREQUENCY) {
    content.mentions = generateMentions(seed, peers);
  }
  return content;
}

async function generatePrivate(
  seed: string,
  i: number,
  latestmsg: number,
  msgsByType: MsgsByType,
  peer: Peer,
  peers: Array<Peer>,
): Promise<[Msg | Privatable<Content>, Array<FeedId>?]> {
  const type = sampleCollection(seed, freq.PRIVATE_FREQUENCIES);
  const peerTribes = await pify<string[]>(peer.tribes.list)()
  if (type === 'tribe_creation' || peerTribes.length == 0) {
    const {groupId, groupInitMsg} = await pify<any>(peer.tribes.create)(null);
    console.log(`${peer.id.slice(0, 6)} created tribe ${groupId.slice(0, 6)}`);
    return [groupInitMsg as Msg];
  } else if (
    type === 'tribe_invitation' &&
    peerTribes.length > 0 &&
    peers.length > 1
  ) {
    const groupId = uniformSample(
      seed,
      peerTribes,
    );
    const inviteeIds: Array<FeedId> = paretoSampleMany(
      seed,
      peers.map((a) => a.id),
      randomInt(seed, 2, 15),
      [peer.id], // add peer.id to force others to be different
    );
    inviteeIds.shift(); // remove peer.id
    const text = __lorem.generateWords(randomInt(seed, 1, 9));
    const msg = await pify(peer.tribes.invite)(groupId, inviteeIds, {text});
    console.log(
      `${peer.id.slice(0, 6)} invited ${inviteeIds
        .map((id) => id.slice(0, 6))
        .join(',')} to tribe ${groupId.slice(0, 6)}`,
    );
    return [msg as Msg, inviteeIds];
  } else if (type === 'tribe_message' && peerTribes.length > 0) {
    const content: Privatable<PostContent> = generatePostContent(
      seed,
      i,
      latestmsg,
      msgsByType,
      peers,
      'private',
    );
    const groupId = uniformSample(
      seed,
      peerTribes
    );
    content.recps = [groupId];
    console.log(
      `${peer.id.slice(0, 6)} posted to tribe ${groupId.slice(0, 6)}`,
    );
    return [content];
  } else {
    const content: Privatable<PostContent> = generatePostContent(
      seed,
      i,
      latestmsg,
      msgsByType,
      peers,
      'private',
    );
    const recps = generateRecipients(seed, peer, peers);
    content.recps = recps;
    return [content];
  }
}

function generateVoteContent(
  seed: string,
  msgsByType: MsgsByType,
): VoteContent {
  const other: Msg = paretoSample(seed, msgsByType.post!);
  return {
    type: 'vote',
    vote: {
      link: other.key,
      value: random(seed) < freq.VOTE_NEGATIVE_FREQUENCY ? -1 : +1,
      expression: 'y',
    },
  };
}

function generateContactContent(
  seed: string,
  peer: Peer,
  peers: Array<Peer>,
  follows: Follows,
  blocks: Blocks,
): ContactContent {
  // Sample other peers, but don't sample ourself
  let contact: FeedId;
  do {
    contact = paretoSample(seed, peers).id;
  } while (contact === peer.id && peers.length > 1);

  let subtype = sampleCollection(seed, freq.CONTACT_TYPE_FREQUENCIES);
  const peersFollows = follows.get(peer.id)!;
  const peerBlocks = blocks.get(peer.id)!;

  if (subtype === 'unfollow') {
    if (peersFollows.size > 0) {
      contact = uniformSample(seed, Array.from(peersFollows));
    } else {
      subtype = 'follow';
    }
  } else if (subtype === 'unblock') {
    if (peerBlocks.size > 0) {
      contact = uniformSample(seed, Array.from(peerBlocks));
    } else {
      subtype = 'block';
    }
  }

  const content: ContactContent = {type: 'contact', contact};
  if (subtype === 'follow') content.following = true;
  else if (subtype === 'unfollow') content.following = false;
  else if (subtype === 'block') content.blocking = true;
  else if (subtype === 'unblock') content.blocking = false;
  return content;
}

export function generateAuthors(seed: string, numAuthors: number) {
  return Array.from({length: numAuthors}, (_, i) => {
    const ed25519seed = Buffer.alloc(32);
    Buffer.from(`${i}${seed}`, 'utf-8').copy(ed25519seed);
    return ssbKeys.generate('ed25519', ed25519seed);
  });
}

function generateAboutImage(seed: string) {
  const subtype = sampleCollection(seed, freq.ABOUT_IMAGE_TYPE_FREQUENCIES);
  if (subtype === 'big_object') {
    return {
      link: generateBlobId(),
      type: sampleCollection(seed, freq.BLOB_IMAGE_TYPE_FREQUENCIES),
      size: Math.round(somewhatGaussian(seed) * 2e6),
      width: Math.round(somewhatGaussian(seed) * 1600),
      height: Math.round(somewhatGaussian(seed) * 1600),
    };
  }
  if (subtype === 'small_object') {
    return {
      link: generateBlobId(),
    };
  }
  if (subtype === 'string') {
    return generateBlobId();
  }
}

function generateAboutContent(seed: string, peer: Peer, peers: Array<Peer>) {
  const about: FeedId =
    random(seed) < freq.ABOUT_OTHER_FREQUENCY
      ? uniformSample(seed, peers).id
      : peer.id;
  const subtype = sampleCollection(seed, freq.ABOUT_TYPE_FREQUENCIES);
  const hasName =
    subtype === 'name' ||
    subtype === 'name_and_description' ||
    subtype === 'name_and_image' ||
    subtype === 'name_and_image_and_description';
  const hasImage =
    subtype === 'image' ||
    subtype === 'image_and_description' ||
    subtype === 'name_and_image' ||
    subtype === 'name_and_image_and_description';
  const hasDescription =
    subtype === 'description' ||
    subtype === 'image_and_description' ||
    subtype === 'name_and_description' ||
    subtype === 'name_and_image_and_description';
  const content: AboutContent = {type: 'about', about};
  if (hasName) content.name = __lorem.generateWords(randomInt(seed, 1, 3));
  if (hasImage) content.image = generateAboutImage(seed) as any;
  if (hasDescription) {
    content.description = __lorem.generateSentences(randomInt(seed, 1, 5));
  }
  return content;
}

export async function generateMsgOrContent(
  seed: string,
  i: number,
  latestmsg: number,
  peer: Peer,
  msgsByType: MsgsByType,
  peers: Array<Peer>,
  follows: Follows,
  blocks: Blocks,
): Promise<[Msg | Content, Array<FeedId>?]> {
  __lorem = new LoremIpsum({
    random: random,
    sentencesPerParagraph: {
      max: 8,
      min: 4,
    },
    wordsPerSentence: {
      max: 16,
      min: 4,
    },
  });

  const type = sampleCollection(seed, freq.MSG_TYPE_FREQUENCIES);
  // Oldest and latest msgs are always a post authored by database owner
  if (i === 0 || i === latestmsg) {
    return [generatePostContent(seed, i, latestmsg, msgsByType, peers)];
  } else if (type === 'vote' && msgsByType.post?.length) {
    return [generateVoteContent(seed, msgsByType)];
  } else if (type === 'contact') {
    return [generateContactContent(seed, peer, peers, follows, blocks)];
  } else if (type === 'about') {
    return [generateAboutContent(seed, peer, peers)];
  } else if (type === 'private') {
    const [p, ps] = [peer, peers]; // sorry Prettier, i want a one-liner
    return generatePrivate(seed, i, latestmsg, msgsByType, p, ps);
  } else if (type === 'post') {
    return [generatePostContent(seed, i, latestmsg, msgsByType, peers)];
  } else {
    return [generatePostContent(seed, i, latestmsg, msgsByType, peers)];
  }
}
