import {Msg, FeedId} from 'ssb-typescript';
import freq = require('./frequencies');

export type Opts = {
  outputDir: string;
  seed: string;
  messages: number;
  authors: number;
  slim: boolean;
  report: boolean;
  latestmsg: number;
  verbose: boolean;
};

export type GroupIp = string;

export type MsgType = keyof typeof freq.MSG_TYPE_FREQUENCIES;

export type MsgsByType = Partial<Record<MsgType, Array<Msg>>>;

export type Peer = {
  publish: (x: any, cb: (err: any, val: any) => void) => void;
  close: (cb?: (err: any, val: any) => void) => void;
  tribes: {
    list: (cb: (err: any, val: string[]) => void) => void;
    create: () => any;
    invite: (x: any) => any;
  };
  id: FeedId;
};

export type Follows = Map<FeedId, Set<FeedId>>;
export type Blocks = Map<FeedId, Set<FeedId>>;
