const SecretStack = require('secret-stack');
const makeConfig = require('ssb-config/inject');
import fs = require('fs');
import path = require('path');

export function makeSSB(authorsKeys: Array<any>, outputDir: string): any {
  const hops0Keys = authorsKeys[0];

  const peer = SecretStack({appKey: require('ssb-caps').shs})
    .use(require('ssb-master'))
    .use(require('ssb-logging'))
    .use(require('ssb-db'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))
    .use(require('ssb-tribes'))
    .use(require('ssb-private1'))
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

  if (authorsKeys[1]) saveSecret(authorsKeys[1], outputDir, 'secret-b');
  if (authorsKeys[2]) saveSecret(authorsKeys[2], outputDir, 'secret-c');

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
