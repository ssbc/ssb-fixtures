const TestBot = require('scuttle-testbot');

export function makeSSB(keys: any, path?: string): any {
  const safeFeedId = (id: string) => id.slice(1, -9).replace(/[\+\/\.]/g, '');
  return TestBot.use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))
    .use(require('ssb-tribes'))
    .use(require('ssb-private1'))
    .call(null, {
      keys,
      name: 'ssb-fixtures-' + safeFeedId(keys.id),
      path,
      startUnclean: path ? true : false,
      logging: {
        level: 'info',
      },
      connections: {
        incoming: {},
        outgoing: {},
      },
    });
}
