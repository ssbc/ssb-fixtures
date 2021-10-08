// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: Unlicense

const fs = require('fs');
const os = require('os');
const path = require('path');
const OffsetLog = require('flumelog-offset');
const codec = require('flumecodec');
const Flume = require('flumedb');
const rimraf = require('rimraf');
const pull = require('pull-stream');
const fromEvent = require('pull-stream-util/from-event');
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
          rimraf.sync(outputDir);
          cb();
        }
        const msgs = arr.map((x) => x.value);
        db.close(() => {
          cb(err, msgs, cleanup, outputDir);
        });
      }),
    );
  });
}

function db2MigrationDone(sbot) {
  return new Promise((resolve, reject) => {
    pull(
      fromEvent('ssb:db2:migrate:progress', sbot),
      pull.filter((x) => x === 1),
      pull.take(1),
      pull.collect((err) => {
        if (err) reject(err);
        else resolve(void 0);
      }),
    );
  });
}

module.exports = {
  generateAndTest,
  db2MigrationDone,
};
