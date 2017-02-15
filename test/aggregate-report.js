#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');
const istanbul = require('istanbul');
const reporter = new istanbul.Reporter();
const collector = new istanbul.Collector();

reporter.addAll(['lcov', 'html', 'text-summary']);

glob.sync('./coverage/**/coverage*.json').forEach(file => {
  process.stdout.write(`adding file: ${file}\n`);
  collector.add(JSON.parse(fs.readFileSync(file)));
});

reporter.write(collector, true, () => {
  process.stdout.write('report combined...\n');
  process.exit(0);
});
