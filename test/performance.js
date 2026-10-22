'use strict';
const { performance } = require('node:perf_hooks');
const MD = require('../MD.js');
const md = new MD({ mode: 'extended' });
const sizes = [4, 16, 64, 256];
console.log('MD.js Reborn · Node', process.version);
console.log('Payload | best of 5 parses | throughput | output size');
for (const size of sizes) {
  const line = '## Demo heading\n\nParagraph **bold** with [link](https://example.com).\n\n';
  const input = line.repeat(Math.ceil(size * 1024 / line.length)).slice(0, size * 1024);
  const times = [];
  let out = '';
  md.parse(input);
  for (let j = 0; j < 5; j++) {
    const begin = performance.now();
    out = md.parse(input);
    times.push(performance.now() - begin);
  }
  const best = Math.min(...times);
  console.log(`${size.toString().padStart(3)} KiB | ${best.toFixed(2).padStart(9)} ms | ${(size / 1024 / (best / 1000)).toFixed(2).padStart(8)} MiB/s | ${(Buffer.byteLength(out) / 1024).toFixed(1)} KiB`);
}
