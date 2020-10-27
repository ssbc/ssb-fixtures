const SecretStack = require('secret-stack');
const makeConfig = require('ssb-config/inject');
const ssbKeys = require('ssb-keys');
import fs = require('fs');
import path = require('path');

export function makeSsbPeer(authorsKeys: Array<any>, outputDir: string): any {
  const hops0Keys = authorsKeys[0];

  const peer = SecretStack({appKey: require('ssb-caps').shs})
    .use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-db'))
    .call(
      null,
      makeConfig('ssb', {
        path: outputDir,
        keys: hops0Keys,
        logging: {
          level: 'info',
        },
        connections: {
          incoming: {},
          outgoing: {},
        },
      }),
    );

  saveSecret(hops0Keys, outputDir);

  return peer;
}

function saveSecret(keys: unknown, outputDir: string) {
  const filePath = path.join(outputDir, 'secret');
  const fileContent = JSON.stringify(keys, null, 2);
  fs.writeFileSync(filePath, fileContent, {encoding: 'utf-8'});
}
