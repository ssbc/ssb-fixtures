import crypto = require('crypto');
import {LoremIpsum} from 'lorem-ipsum';
import {
  ContactContent,
  FeedId,
  Msg,
  PostContent,
  VoteContent,
} from 'ssb-typescript';
import freq = require('./frequencies');
import {
  paretoSample,
  uniformSample,
  randomInt,
  sampleCollection,
  somewhatGaussian,
} from './sample';
import {Author, Blocks, Follows, MsgsByType} from './types';

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

function generateBlobId() {
  return '&' + crypto.randomBytes(32).toString('base64') + '.sha256';
}

function generateMentions(authors: Array<Author>) {
  return Array.from({length: randomInt(1, 4)}, () => {
    const mentionType = sampleCollection(freq.MENTION_LINK_FREQUENCIES);
    if (mentionType === 'author') {
      const author = paretoSample(authors);
      return {link: author.id, name: lorem.generateWords(randomInt(1, 3))};
    } else if (mentionType === 'blob') {
      return {
        link: generateBlobId(),
        type: sampleCollection(freq.BLOB_TYPE_FREQUENCIES),
        size: Math.round(somewhatGaussian() * 2e6),
        ...(Math.random() < freq.MENTION_BLOB_NAME_FREQUENCY
          ? {
              name: lorem.generateWords(randomInt(1, 3)),
            }
          : {}),
      };
    } else if (mentionType === 'channel') {
      return {link: '#' + lorem.generateWords(1)};
    }
  });
}

function generatePostMsg(
  i: number,
  numMessages: number,
  msgsByType: MsgsByType,
  authors: Array<Author>,
): PostContent {
  const textSize = sampleCollection(freq.POST_SIZE_FREQUENCIES);
  const text =
    textSize === 'short'
      ? lorem.generateWords(randomInt(1, 5))
      : textSize === 'medium'
      ? lorem.generateSentences(randomInt(1, 5))
      : lorem.generateParagraphs(randomInt(1, 5));
  const content: PostContent = {
    type: 'post',
    text,
  };
  if (i === 0) {
    content.text = 'OLDESTMSG ' + content.text;
  }
  if (i === numMessages - 1) {
    content.text = 'LATESTMSG ' + content.text;
  }
  if (Math.random() < freq.POST_CHANNEL_FREQUENCY) {
    content.channel = lorem.generateWords(1);
  }
  if (
    i < numMessages - 1 && // Don't make the last msg a reply, it should be root
    msgsByType.post?.length && // Only reply if there are other post
    Math.random() < freq.POST_REPLY_FREQUENCY
  ) {
    const other = paretoSample(msgsByType.post) as Msg<PostContent>;
    if (other.value.content?.root) {
      if (Math.random() < freq.POST_REPLY_FORK_FREQUENCY) {
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
  if (Math.random() < freq.POST_MENTIONS_FREQUENCY) {
    content.mentions = generateMentions(authors);
  }
  return content;
}

function generateVoteMsg(msgsByType: MsgsByType): VoteContent {
  const other: Msg = paretoSample(msgsByType.post!);
  return {
    type: 'vote',
    vote: {
      link: other.key,
      value: Math.random() < freq.VOTE_NEGATIVE_FREQUENCY ? -1 : +1,
      expression: 'y',
    },
  };
}

function generateContactMsg(
  author: Author,
  authors: Array<Author>,
  follows: Follows,
  blocks: Blocks,
): ContactContent {
  // Sample other authors, but don't sample ourself
  let contact: FeedId;
  do {
    contact = paretoSample(authors).id;
  } while (contact === author.id);

  let subtype = sampleCollection(freq.CONTACT_TYPE_FREQUENCIES);
  const authorFollows = follows.get(author.id)!;
  const authorBlocks = blocks.get(author.id)!;

  if (subtype === 'unfollow') {
    if (authorFollows.size > 0) {
      contact = uniformSample(Array.from(authorFollows));
    } else {
      subtype = 'follow';
    }
  } else if (subtype === 'unblock') {
    if (authorBlocks.size > 0) {
      contact = uniformSample(Array.from(authorBlocks));
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

export default function generateMsg(
  i: number,
  numMessages: number,
  author: Author,
  msgsByType: MsgsByType,
  authors: Array<Author>,
  follows: Follows,
  blocks: Blocks,
) {
  const type = sampleCollection(freq.MSG_TYPE_FREQUENCIES);
  // Oldest and latest msgs are always a post
  if (i === 0 || i === numMessages - 1) {
    return generatePostMsg(i, numMessages, msgsByType, authors);
  } else if (type === 'vote' && msgsByType.post?.length) {
    return generateVoteMsg(msgsByType);
  } else if (type === 'contact') {
    return generateContactMsg(author, authors, follows, blocks);
  } else if (type === 'post') {
    return generatePostMsg(i, numMessages, msgsByType, authors);
  } else {
    return generatePostMsg(i, numMessages, msgsByType, authors);
  }
}
