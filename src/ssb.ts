const TestBot = require('scuttle-testbot');

export function makeSSB(keys: any, path?: string): any {
  return TestBot.use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))
    .use(require('ssb-tribes'))
    .use(require('ssb-private1'))
    .call(null, {
      keys,
      path,
      startUnclean: true,
      logging: {
        level: 'info',
      },
      connections: {
        incoming: {},
        outgoing: {},
      },
    });
}
