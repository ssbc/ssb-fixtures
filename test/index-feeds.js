const test = require('tape');
const path = require('path');
const ssbKeys = require('ssb-keys');
const SecretStack = require('secret-stack');
const {where, type, count, toPromise} = require('ssb-db2/operators');
const {generateAndTest, db2MigrationDone} = require('./utils');

test('generation supports simulating meta feeds and index feeds', (t) => {
  const M = 50;
  const A = 8;
  const I = 100;

  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-index-feeds',
      seed: 'banana',
      messages: M,
      authors: A,
      indexFeeds: I,
      indexFeedTypes: 'about,vote,contact,post,private'
    },
    async (err, msgs, cleanup, outputDir) => {
      // (seed + announce + add main + add indexes + add 5 index) * A
      const META_MSG_COUNT = 9 * A;
      // Seems like we should have only `M` index feed msgs, right?
      // But it's truly `M + A` because each author will publish a **private**
      // message `metafeed/seed` and this message will be taken into account
      // for the index feed `{author,type:null,private:true}`.
      const INDEX_MSG_COUNT = M + A;

      t.error(err, 'no error');
      t.equals(
        msgs.length,
        M + META_MSG_COUNT + INDEX_MSG_COUNT,
        'count normal msgs + meta msgs + index msgs',
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
      t.equals(indexMsgCount, INDEX_MSG_COUNT, 'created all index feed msgs');

      sbot.db.onDrain(() => {
        setTimeout(() => {
          sbot.close(() => {
            cleanup(() => {
              t.end();
            });
          });
        }, 500);
      });
    },
  );
});
