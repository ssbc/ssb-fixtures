import os = require('os');
import fs = require('fs');
import path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

export default function slimify(outputDir: string) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssb-fixture-gen-'));
  const preserved = ['secret', 'flume/log.offset', 'report.md'];
  for (let p of preserved) {
    mkdirp.sync(path.dirname(path.join(tmpDir, p)));
    fs.copyFileSync(path.join(outputDir, p), path.join(tmpDir, p));
  }
  rimraf.sync(outputDir);
  fs.mkdirSync(outputDir);
  for (let p of preserved) {
    mkdirp.sync(path.dirname(path.join(outputDir, p)));
    fs.copyFileSync(path.join(tmpDir, p), path.join(outputDir, p));
  }
}
