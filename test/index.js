// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: Unlicense

const test = require('tape');
const Ref = require('ssb-ref');
const {generateAndTest} = require('./utils');

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

test('can generate about msgs', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-3',
      seed: 'food',
      messages: 8,
      authors: 1,
    },
    (err, msgs, cleanup) => {
      t.error(err, 'no error');
      t.equals(msgs.length, 8, 'there are 8 msgs');

      t.equals(msgs[6].value.content.type, 'about', '4th msg is an about');
      t.equals(msgs[6].value.content.name, 'tempor dolore', '"name" field');

      cleanup(() => {
        t.end();
      });
    },
  );
});

test('latestmsg and same seed can continue generating', (t) => {
  generateAndTest(
    {
      outputDir: 'ssb-fixtures-test-4',
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

      t.equals(
        typeof msgs[3].value.content,
        'string',
        'forth message is private',
      );

      t.equals(
        msgs[4].value.content.type,
        'other',
        'fifth message is an other',
      );

      cleanup(() => {
        t.end();
      });
    },
  );
});
