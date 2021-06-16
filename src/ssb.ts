const SecretStack = require('secret-stack');
const makeConfig = require('ssb-config/inject');
import fs = require('fs');
import path = require('path');

const noop = () => {};

export function makeSSB(
  authorsKeys: Array<any>,
  outputDir: string,
  followGraph: boolean,
): any {
  const hops0Keys = authorsKeys[0];

  const peer = SecretStack({appKey: require('ssb-caps').shs})
    .use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-db'))
    .use(followGraph ? require('ssb-friends') : noop)
    .call(
      null,
      makeConfig('ssb', {
        path: outputDir,
        keys: hops0Keys,
        logging: {
          level: 'info',
        },
        friends: {
          hookReplicate: false,
        },
        connections: {
          incoming: {},
          outgoing: {},
        },
      }),
    );

  saveSecret(hops0Keys, outputDir);

  for (let i = 1; i < authorsKeys.length; i++) {
    saveSecret(authorsKeys[i], outputDir, `secret-${i}`);
  }

  return peer;
}

function saveSecret(
  keys: unknown,
  outputDir: string,
  filename: string = 'secret',
) {
  const filePath = path.join(outputDir, filename);
  const fileContent = JSON.stringify(keys, null, 2);
  fs.writeFileSync(filePath, fileContent, {encoding: 'utf-8'});
}
