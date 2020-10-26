export = {
  /**
   * Distribution of msg types, based on
   * https://github.com/arj03/ssb-new-format#message-types.
   *
   * Not normalized.
   */
  MSG_TYPE_FREQUENCIES: {
    vote: 269447,
    post: 173264,
    contact: 167326,
    // private: 93208,
    // channel: 57087,
    // about: 33476,
    // chess_move: 24199,
    // pub: 17646,
    // 'image/jpeg': 10681,
    // 'git-update': 8915,
    // 'image/png': 5809,
  },

  /**
   * Distribution of the approximate size of msgs of type 'post'.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  POST_SIZE_FREQUENCIES: {
    short: 0.25,
    medium: 0.4,
    long: 0.35,
  },

  /**
   * Probability of msgs of type 'post' to include a 'channel' field.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  POST_CHANNEL_FREQUENCY: 0.3,

  /**
   * Probability of msgs of type 'post' to include a 'mentions' field.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  POST_MENTIONS_FREQUENCY: 0.6,

  /**
   * Distribution of types of mentions in msgs of type 'post'.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  MENTION_LINK_FREQUENCIES: {
    author: 0.6,
    blob: 0.3,
    channel: 0.1,
  },

  /**
   * Probability of a mention of a blob to include a 'name' field.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  MENTION_BLOB_NAME_FREQUENCY: 0.2,

  /**
   * Probability of msgs of type 'post' to be a reply to another msg.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  POST_REPLY_FREQUENCY: 0.7,

  /**
   * Probability of replies to be a fork of an existing thread.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  POST_REPLY_FORK_FREQUENCY: 0.7,

  /**
   * Probability of msgs of type 'vote' to have a negative value.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  VOTE_NEGATIVE_FREQUENCY: 0.05,

  /**
   * Distribution of subtypes of msgs of type 'contact', indicating following or
   * blocking or unfollowing or unblocking.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  CONTACT_TYPE_FREQUENCIES: {
    follow: 0.7,
    unfollow: 0.1,
    block: 0.15,
    unblock: 0.05,
  },

  /**
   * Distribution of blob MIME types, based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  BLOB_TYPE_FREQUENCIES: {
    'image/jpeg': 0.5,
    'image/png': 0.5,
  },
};
