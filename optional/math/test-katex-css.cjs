/* Guard against accidentally vendoring CSS scoped to an unrelated host. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, 'vendor/katex.min.css'), 'utf8');
test('KaTeX CSS must be reusable outside the vendor host', () => {
  assert.doesNotMatch(css, /gradio-container-6-5-1/);
  assert.match(css, /\.katex\s*\{/);
  assert.match(css, /\.katex-mathml\s*\{/);
  assert.match(css, /\.katex-display\s*\{/);
  assert.match(css, /\.katex\s+\.base\s*\{/);
});
