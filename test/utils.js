const fs = require('fs');
const os = require('os');
const path = require('path');
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
        cb(err, msgs, cleanup);
      }),
    );
  });
}

module.exports = {
  generateAndTest,
};
