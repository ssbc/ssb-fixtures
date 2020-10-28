import crypto = require('crypto');
const ssbKeys = require('ssb-keys');
import {LoremIpsum} from 'lorem-ipsum';
import {
  AboutContent,
  ContactContent,
  FeedId,
  Msg,
  PostContent,
  Privatable,
  VoteContent,
} from 'ssb-typescript';
import freq = require('./frequencies');
import {
  paretoSample,
  uniformSample,
  randomInt,
  sampleCollection,
  somewhatGaussian,
  random,
} from './sample';
import {Author, Blocks, Follows, MsgsByType} from './types';

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

function generateMentions(seed: string, authors: Array<Author>) {
  return Array.from({length: randomInt(seed, 1, 4)}, () => {
    const mentionType = sampleCollection(seed, freq.MENTION_LINK_FREQUENCIES);
    if (mentionType === 'author') {
      const author = paretoSample(seed, authors);
      return {
        link: author.id,
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
  author: Author,
  authors: Array<Author>,
): Required<Privatable<{}>>['recps'] {
  if (authors.length <= 1) return [author.id];
  const quantity = randomInt(seed, 1, Math.min(authors.length - 1, 7));
  // Always include author
  const recps = [author.id];
  // Sample other authors, but don't sample ones that are already recipient
  while (recps.length < quantity) {
    let other: FeedId;
    do {
      other = paretoSample(seed, authors).id;
    } while (recps.some((r) => other === r));
    recps.push(other);
  }
  return recps;
}

function generatePostMsg(
  seed: string,
  i: number,
  numMessages: number,
  msgsByType: MsgsByType,
  authors: Array<Author>,
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
  if (i === numMessages - 1) {
    content.text = 'LATESTMSG ' + content.text;
  }
  // Channel
  if (random(seed) < freq.POST_CHANNEL_FREQUENCY) {
    content.channel = __lorem.generateWords(1);
  }
  // Replies
  if (
    type !== 'private' && // Private msg should not reply to `other` public msg
    i < numMessages - 1 && // Don't make the last msg a reply, it should be root
    (msgsByType.post?.length ?? 0) >= 2 && // Only reply if there are other post
    random(seed) < freq.POST_REPLY_FREQUENCY
  ) {
    const min = 1; // avoid 0, to never reply to the OLDESTMSG
    const other = paretoSample(seed, msgsByType.post!, 1.6, min) as Msg<
      PostContent
    >;
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
    content.mentions = generateMentions(seed, authors);
  }
  return content;
}

function generatePrivateMsg(
  seed: string,
  i: number,
  numMessages: number,
  msgsByType: MsgsByType,
  author: Author,
  authors: Array<Author>,
): string {
  const content: Privatable<PostContent> = generatePostMsg(
    seed,
    i,
    numMessages,
    msgsByType,
    authors,
    'private',
  );
  const recps = generateRecipients(seed, author, authors);
  content.recps = recps;
  return ssbKeys.box(content, content.recps);
}

function generateVoteMsg(seed: string, msgsByType: MsgsByType): VoteContent {
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

function generateContactMsg(
  seed: string,
  author: Author,
  authors: Array<Author>,
  follows: Follows,
  blocks: Blocks,
): ContactContent {
  // Sample other authors, but don't sample ourself
  let contact: FeedId;
  do {
    contact = paretoSample(seed, authors).id;
  } while (contact === author.id && authors.length > 1);

  let subtype = sampleCollection(seed, freq.CONTACT_TYPE_FREQUENCIES);
  const authorFollows = follows.get(author.id)!;
  const authorBlocks = blocks.get(author.id)!;

  if (subtype === 'unfollow') {
    if (authorFollows.size > 0) {
      contact = uniformSample(seed, Array.from(authorFollows));
    } else {
      subtype = 'follow';
    }
  } else if (subtype === 'unblock') {
    if (authorBlocks.size > 0) {
      contact = uniformSample(seed, Array.from(authorBlocks));
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

function generateAboutMsg(
  seed: string,
  author: Author,
  authors: Array<Author>,
) {
  const about: FeedId =
    random(seed) < freq.ABOUT_OTHER_FREQUENCY
      ? uniformSample(seed, authors).id
      : author.id;
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

export function generateMsg(
  seed: string,
  i: number,
  numMsgs: number,
  author: Author,
  msgsByType: MsgsByType,
  authors: Array<Author>,
  follows: Follows,
  blocks: Blocks,
) {
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
  if (i === 0 || i === numMsgs - 1) {
    return generatePostMsg(seed, i, numMsgs, msgsByType, authors);
  } else if (type === 'vote' && msgsByType.post?.length) {
    return generateVoteMsg(seed, msgsByType);
  } else if (type === 'contact') {
    return generateContactMsg(seed, author, authors, follows, blocks);
  } else if (type === 'about') {
    return generateAboutMsg(seed, author, authors);
  } else if (type === 'private') {
    return generatePrivateMsg(seed, i, numMsgs, msgsByType, author, authors);
  } else if (type === 'post') {
    return generatePostMsg(seed, i, numMsgs, msgsByType, authors);
  } else {
    return generatePostMsg(seed, i, numMsgs, msgsByType, authors);
  }
}
