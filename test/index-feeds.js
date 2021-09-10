const test = require('tape');
const path = require('path');
const ssbKeys = require('ssb-keys');
const SecretStack = require('secret-stack');
const {where, or, type, count, toPromise} = require('ssb-db2/operators');
const {generateAndTest, db2MigrationDone} = require('./utils');

test('generation supports simulating meta feeds and index feeds', (t) => {
  const M = 50;
  const A = 8;
  const I = 30;

  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-index-feeds',
      seed: 'apple',
      messages: M,
      authors: A,
      indexFeeds: I,
    },
    async (err, msgs, cleanup, outputDir) => {
      t.error(err, 'no error');
      t.true(
        msgs.length > M,
        `there are more than ${M} msgs, in fact ` + msgs.length,
      );

      const sbot = SecretStack({caps: require('ssb-caps')})
        .use(require('ssb-db2'))
        .call(null, {
          path: outputDir,
          keys: ssbKeys.loadOrCreateSync(path.join(outputDir, 'secret')),
          db2: {
            automigrate: true,
          },
        });

      await db2MigrationDone(sbot);
      t.pass('migration to log.bipf is done, now querying index msgs');

      const indexMsgCount = await sbot.db.query(
        where(type('metafeed/index')),
        count(),
        toPromise(),
      );
      t.equals(indexMsgCount, 25, 'created some index feed msgs');

      sbot.db.onDrain(() => {
        sbot.close(() => {
          cleanup(() => {
            t.end();
          });
        });
      });
    },
  );
});
