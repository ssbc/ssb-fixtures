const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('tape');
const Ref = require('ssb-ref');
const OffsetLog = require('flumelog-offset');
const codec = require('flumecodec');
const Flume = require('flumedb');
const rimraf = require('rimraf');
const pull = require('pull-stream');
const __ts = require('monotonic-timestamp');
const __sampling = require('../lib/sample');
const generate = require('../lib/index');

function generateAndTest(opts, cb) {
  __ts.reset();
  __sampling.reset();
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), opts.outputDir));

  generate({...opts, outputDir}).then(() => {
    const logOffset = path.join(outputDir, 'flume', 'log.offset');
    const db = Flume(OffsetLog(logOffset, {codec: codec.json}));

    pull(
      db.stream({keys: false, values: true}),
      pull.collect((err, arr) => {
        function cleanup(cb) {
          db.close(() => {
            rimraf.sync(outputDir);
            cb();
          });
        }
        const msgs = arr.map((x) => x.value);
        msgs.sort((a, b) => a.value.timestamp - b.value.timestamp);
        cb(err, msgs, cleanup);
      }),
    );
  });
}

test('generation is seed-based deterministic', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-1',
      seed: 'deterministic',
      messages: 3,
      authors: 2,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 3, 'there are 3 msgs');
      t.deepEquals(
        msgs[0],
        require('./fixtures/deterministic/0.json'),
        'first message matches',
      );

      t.deepEquals(
        msgs[1],
        require('./fixtures/deterministic/1.json'),
        'second message matches',
      );

      t.deepEquals(
        msgs[2],
        require('./fixtures/deterministic/2.json'),
        'third message matches',
      );

      cleanup(() => {
        t.end();
      });
    },
  );
});

test('marks first and last msg as OLDESTMSG and LATESTMSG', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-2',
      seed: 'firstmsg',
      messages: 3,
      authors: 1,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 3, 'there are 3 msgs');

      t.equals(msgs[0].value.content.type, 'post', 'first msg is a post');
      t.true(
        msgs[0].value.content.text.startsWith,
        'OLDESTMSG ',
        'first msg is prefixed with OLDESTMSG',
      );

      t.true(
        !msgs[1].value.content.text.startsWith('OLDESTMSG'),
        'in between msgs dont have OLDESTMSG prefix',
      );
      t.true(
        !msgs[1].value.content.text.startsWith('LATESTMSG'),
        'in between msgs dont have LATESTMSG prefix',
      );

      t.equals(msgs[2].value.content.type, 'post', 'last msg is a post');
      t.true(
        msgs[2].value.content.text.startsWith,
        'LATESTMSG ',
        'last msg is prefixed with LATESTMSG',
      );

      cleanup(() => {
        t.end();
      });
    },
  );
});

test('can generate vote msgs', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-3',
      seed: 'dog4',
      messages: 4,
      authors: 1,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 4, 'there are 4 msgs');

      const m = msgs[1];
      t.equals(m.value.content.type, 'vote', '2nd msg is an about');
      t.equals(m.value.content.vote.value, 1, 'vote.value is 1');
      t.equals(m.value.content.vote.expression, 'y', 'vote.expression');
      t.true(Ref.isMsg(m.value.content.vote.link), 'vote.link');

      cleanup(() => {
        t.end();
      });
    },
  );
});

test('can generate about msgs', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-4',
      seed: 'dog2',
      messages: 5,
      authors: 1,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 5, 'there are 5 msgs');

      t.equals(msgs[3].value.content.type, 'about', '4th msg is an about');
      t.equals(msgs[3].value.content.name, 'magna esse', 'contains name');
      t.true(Ref.isBlob(msgs[3].value.content.image), 'contains image');

      cleanup(() => {
        t.end();
      });
    },
  );
});

test('can generate tribes', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-5',
      seed: 'apple',
      messages: 5,
      authors: 3,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(typeof msgs[2].value.content, 'string', '3rd msg is encrypted');
      t.true(msgs[2].value.content.endsWith('.box2'), 'encrypted with box2');
      cleanup(() => {
        t.end();
      });
    },
  );
});

test('latestmsg and same seed can continue generating', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-5',
      seed: 'deterministic',
      messages: 5,
      authors: 2,
      latestmsg: 3,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 5, 'there are 5 msgs');
      t.deepEquals(
        msgs[0],
        require('./fixtures/deterministic/0.json'),
        'first message matches',
      );

      t.deepEquals(
        msgs[1],
        require('./fixtures/deterministic/1.json'),
        'second message matches',
      );

      t.deepEquals(
        msgs[2],
        require('./fixtures/deterministic/2.json'),
        'third message matches',
      );

      t.deepEquals(
        msgs[3],
        require('./fixtures/deterministic/3-extension.json'),
        'forth message matches',
      );

      t.deepEquals(
        msgs[4],
        require('./fixtures/deterministic/4-extension.json'),
        'fifth message matches',
      );

      cleanup(() => {
        t.end();
      });
    },
  );
});
