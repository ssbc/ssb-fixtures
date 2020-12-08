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
    private: 93208,
    // channel: 57087,
    about: 33476,
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
   * Distribution of "private threads" versus "private groups (tribes)".
   * Not based on real world data because we (as of 2020-12) don't have
   * tribes deployed in production.
   *
   * Normalized.
   */
  PRIVATE_FREQUENCIES: {
    direct_message: 0.7,
    tribe_creation: 0.05,
    tribe_invitation: 0.1,
    tribe_message: 0.15,
  },

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

  /**
   * Distribution of image blob MIME types, based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  BLOB_IMAGE_TYPE_FREQUENCIES: {
    'image/jpeg': 0.5,
    'image/png': 0.5,
  },

  /**
   * Distribution of subtypes of msgs of type 'about', whether they include the
   * fields "name", "description", or "image".
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  ABOUT_TYPE_FREQUENCIES: {
    name: 0.3,
    image: 0.2,
    description: 0.1,
    name_and_image: 0.2,
    name_and_description: 0.1,
    image_and_description: 0.05,
    name_and_image_and_description: 0.05,
  },

  /**
   * Distribution of the shape of "content.image" in msgs of type 'about'.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  ABOUT_IMAGE_TYPE_FREQUENCIES: {
    string: 0.5,
    big_object: 0.4,
    small_object: 0.1,
  },

  /**
   * Probability of msgs of type 'about' to be targeted at someone else than the
   * about's author.
   * Based on staltz's intuition.
   * FIXME: base this on analysis of real world data
   *
   * Normalized.
   */
  ABOUT_OTHER_FREQUENCY: 0.02,
};
