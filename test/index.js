const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('tape');
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

  generate({
    outputDir,
    seed: opts.seed,
    messages: opts.messages,
    authors: opts.authors,
  }).then(() => {
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
        {
          key: '%ctqwAmcFfotUvtBSvS1x/ux7CZY7PkbkVkKEdkEvvwM=.sha256',
          value: {
            previous: null,
            sequence: 1,
            author: '@k2M2dnNL5YOtmoHkGGpVq5QM5WOLCP7N3EOY9u3Hk+I=.ed25519',
            timestamp: 1438787025000,
            hash: 'sha256',
            content: {
              type: 'post',
              text:
                'OLDESTMSG Nisi sunt duis elit cupidatat aliquip. Enim quis tempor anim ullamco est fugiat laborum laborum proident ex minim eu amet. Quis nulla velit enim deserunt irure ipsum veniam ad ullamco.',
            },
            signature:
              'B1+WFse9WiixIxb4tioK5YhprWHTycIz8fyjznheCjDaSu6edw2CBrYFRgA0LmZVKC7vN6xyftMMFMJRB5HyAg==.sig.ed25519',
          },
          timestamp: 1438787145000,
        },
        'first message matches',
      );

      t.deepEquals(
        msgs[1],
        {
          key: '%8VrSfeEOCNl3XwFl3okW6632XGXK4Ld8x8GuYoM9IDo=.sha256',
          value: {
            previous: null,
            sequence: 1,
            author: '@CTlYy3ZwIkt4qbB/bIQ7SndWzt8gDM9deKLWwDwbwL8=.ed25519',
            timestamp: 1438787265000,
            hash: 'sha256',
            content: {
              type: 'vote',
              vote: {
                link: '%ctqwAmcFfotUvtBSvS1x/ux7CZY7PkbkVkKEdkEvvwM=.sha256',
                value: 1,
                expression: 'y',
              },
            },
            signature:
              'JVV1lqWYUvS20SHT5I/rrN89AXW7Cuzr6/17SEGJfqMY+FyRe1kozFU5mKc/lqUxMWYorfqO+SsJGY/6afV7Aw==.sig.ed25519',
          },
          timestamp: 1438787385000,
        },
        'second message matches',
      );

      t.deepEquals(
        msgs[2],
        {
          key: '%CfkI9X/AZzG9mrwaRQvVg9D2fPDw4K9e78xuoNiQhqQ=.sha256',
          value: {
            previous: '%ctqwAmcFfotUvtBSvS1x/ux7CZY7PkbkVkKEdkEvvwM=.sha256',
            sequence: 2,
            author: '@k2M2dnNL5YOtmoHkGGpVq5QM5WOLCP7N3EOY9u3Hk+I=.ed25519',
            timestamp: 1438787505000,
            hash: 'sha256',
            content: {
              type: 'post',
              text:
                'LATESTMSG Nostrud velit officia aute enim. Do commodo ad culpa Lorem laboris velit. Exercitation sit ut eu quis sunt cillum incididunt. Dolor est mollit duis pariatur aliqua voluptate fugiat ad id. Magna minim enim dolor quis et sunt aliqua aliquip ex anim dolore nulla ut.\nExcepteur sunt culpa incididunt quis ea aliqua sit proident. Deserunt nulla tempor aute esse aliquip. Do et magna eu aliqua adipisicing ea esse proident labore velit esse elit. In in excepteur dolore. Deserunt adipisicing magna et excepteur et pariatur proident qui ad aliquip ex consectetur adipisicing officia qui.',
              channel: 'ad',
            },
            signature:
              'kM2XnH56+Z4SNOGGED/gdo6W4nM+9sVHIFpHX/MY/OxMK0j6/hZvdWWKTnHFaANmsVV8H3f5rTecsBsTxw1MCQ==.sig.ed25519',
          },
          timestamp: 1438787625000,
        },
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
