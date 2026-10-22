'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MD = require('../MD.js');
const md = new MD({ mode: 'extended' });
const base = new MD();
const render = s => md.parse(s);
const has = (input, output) => assert.ok(render(input).includes(output), `Expected ${JSON.stringify(output)} in ${render(input)}`);
const notHas = (input, output) => assert.ok(!render(input).includes(output), `Unexpected ${JSON.stringify(output)} in ${render(input)}`);

// Keep original MD.js API, eliminate old global U dependency.
test('constructor, mode, no global U, and parse are available', () => {
  assert.equal(typeof MD, 'function');
  assert.equal(typeof md.parse, 'function');
  assert.equal(typeof md.registerCodeHighlight, 'function');
  assert.equal(new MD({ mode: 'invalid' }).options.mode, 'basic');
  assert.equal(md.options.mode, 'extended');
});
test('configuration rejects null and arrays', () => {
  assert.throws(() => new MD(null), TypeError);
  assert.throws(() => new MD([]), TypeError);
  assert.throws(() => render({}), TypeError);
});
test('same instance is deterministic across different parse calls', () => {
  const original = render('# A\n\n- First\n- Second');
  for (let i = 0; i < 30; i++) {
    render('```javascript\nconst x = 42;\n```');
    render('| c | d |\n| --- | --- |\n| e | f |');
  }
  assert.equal(render('# A\n\n- First\n- Second'), original);
});
for (let i = 1; i <= 6; i++) {
  test(`ATX heading H${i}`, () => has(`${'#'.repeat(i)} Title`, `<h${i} class="md-header">Title</h${i}>`));
}
test('H7 is not a heading', () => notHas('####### Title', '<h7'));
test('a space is required after ATX heading marks', () => notHas('#no-space', '<h1'));
test('setext headings H1/H2', () => { has('Title\n=====', '<h1 class="md-header">Title</h1>'); has('Title\n-----', '<h2 class="md-header">Title</h2>'); });
test('headings escape untrusted text', () => has('# <svg onload=alert(1)>', '&lt;svg onload=alert(1)&gt;'));
test('raw HTML is never interpreted as a tag', () => { has('<script>alert(1)</script>', '&lt;script&gt;'); notHas('<script>alert(1)</script>', '<script>'); });
test('less-than, ampersand and quotes escape safely', () => has('a & b < c > d "quote"', 'a &amp; b &lt; c &gt; d &quot;quote&quot;'));
test('strong, emphasis and short one-letter emphasis', () => { has('**bold**', '<strong'); has('*x*', '<em'); has('___hi___', '<strong'); });
test('strike-through', () => has('~~gone~~', '<del>gone</del>'));
test('inline code protects Markdown and raw HTML', () => {
  const html = render('`**bold** <script>evil()</script>`');
  assert.ok(html.includes('**bold** &lt;script&gt;evil()&lt;/script&gt;'));
  assert.ok(!html.includes('<strong'));
  assert.ok(!html.includes('<script'));
});
test('code spans with double backticks', () => has('``some ` backtick``', 'some ` backtick'));
test('fenced code renders escaped code', () => {
  has('```html\n<img src=x onerror=alert(1)>\n```', '&lt;img');
  notHas('```html\n<img src=x onerror=alert(1)>\n```', '<img');
});
test('tilde fences and unclosed fences', () => { has('~~~js\nlet x=1\n~~~', '<pre'); has('```js\nconst v=1', '<pre'); });
test('indented code', () => has('    <b>hello</b>', '&lt;b&gt;hello&lt;/b&gt;'));
test('javascript highlighter outputs escaped tokens', () => {
  const html = render('```js\nconst x = "<img src=x onerror=alert(1)>";\n```');
  assert.ok(html.includes('md-code-syntax-command'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
});
test('basic highlights only core languages', () => { assert.ok(base.parse('```bash\necho hello\n```').includes('md-code-syntax-lang-general')); });
test('escape sequences render literal Markdown punctuation', () => has('\\*not italic\\*', '*not italic*'));
test('thematic break', () => has('---', '<hr>'));
test('paragraph softbreak', () => has('line one\nline two', 'line one\nline two'));
test('paragraph hardbreak', () => has('line one  \nline two', 'line one<br>line two'));
test('blockquotes', () => has('> hello\n> world', '<blockquote class="md-blockquote">'));
test('nested blockquotes', () => has('> > inner', '<blockquote class="md-blockquote"><blockquote'));
test('normal unordered list', () => has('- first\n- second', '<ul class="md-list">'));
test('asterisk unordered list', () => has('* a\n* b', '<li>a</li>'));
test('plus unordered list', () => has('+ a\n+ b', '<li>b</li>'));
test('ordered list', () => has('1. first\n2. second', '<ol class="md-list-ordered">'));
test('ordered start number', () => has('3. third\n4. fourth', 'start="3"'));
test('ordered with right paren', () => has('1) first\n2) second', '<ol'));
test('nested list', () => has('- top\n  - child', '<ul class="md-list"><li>child</li>'));
test('table with text alignment', () => {
  const html = render('| L | R |\n| :--- | ---: |\n| 1 | 2 |');
  assert.ok(html.includes('<table'));
  assert.ok(html.includes('class="md-align-right"'));
  assert.ok(html.includes('<td class="md-align-left">1</td>'));
});
test('tables support literal escaped pipe', () => has('| A | B |\n| --- | --- |\n| a\\|b | c |', 'a|b'));
test('table content escapes raw HTML', () => has('| X | Y |\n| --- | --- |\n| <script> | ok |', '&lt;script&gt;'));
test('legacy compact table works in extended', () => has('[Name; Age\nAda; 25]', 'md-table-compact'));
test('compact table is NOT active in basic', () => assert.ok(!base.parse('[Name; Age\nAda; 25]').includes('md-table-compact')));
test('standard link and rel for external targets', () => has('[OpenAI](https://openai.com)', '<a href="https://openai.com" rel="noopener noreferrer" target="_blank">OpenAI</a>'));
test('relative link', () => has('[local](./guide.md)', 'href="./guide.md"'));
test('image HTTPS URL and alt escape', () => has('![alt](https://example.org/a.png)', '<img class="md-image" src="https://example.org/a.png" alt="alt" loading="lazy">'));
test('image title does not become executable HTML', () => { notHas('![x](https://x.test/a.png " onclick=alert(1))', '<img'); });
test('disallow data images', () => notHas('![x](data:image/svg+xml,<svg/onload=alert(1)>)', '<img'));
for (const url of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,hi', 'file:///etc/passwd', '//evil.example/path', 'javascript&#58;alert(1)', 'java&#x73;cript:alert(1)']) {
  test(`unsafe link destination is never emitted: ${url}`, () => {
    const html = render(`[click](${url})`);
    assert.ok(!html.includes('<a '), html);
    assert.ok(!html.includes('<script'), html);
  });
}
test('valid href query params escape ampersands', () => has('[x](https://x.test/?a=1&b=2)', 'href="https://x.test/?a=1&amp;b=2"'));
test('link text HTML injection blocked', () => has('[<img onerror=alert(1)>](https://example.org)', '&lt;img onerror=alert(1)&gt;'));
test('code highlighter plugin cannot inject HTML through token text', () => {
  const inst = new MD({ mode: 'extended' });
  inst.registerCodeHighlight('custom', () => [{ text: '<svg onload=alert(1)>', type: 'command' }]);
  const html = inst.parse('```custom\nwhatever\n```');
  assert.ok(html.includes('&lt;svg onload=alert(1)&gt;'));
  assert.ok(!html.includes('<svg'));
});
test('code highlighter plugin cannot invent CSS classes', () => {
  const inst = new MD({ mode: 'extended' });
  inst.registerCodeHighlight('custom', () => [{ text: 'x', type: '" onmouseover="alert(1)' }]);
  const html = inst.parse('```custom\nsafe\n```');
  assert.ok(html.includes('<code>safe</code>'), html);
});
test('highlighter callback throwing falls back safely', () => {
  const inst = new MD({ mode: 'extended' });
  inst.registerCodeHighlight('custom', () => { throw Error('oops'); });
  assert.ok(render('```general\nabc\n```').includes('abc'));
  assert.ok(inst.parse('```custom\nabc\n```').includes('<code>abc</code>'));
});
test('highlighter language class cannot inject attributes', () => {
  const html = render('```js" onmouseover="alert(1)\nhello\n```');
  assert.ok(!html.includes('onmouseover='), html);
});
test('malformed Markdown does not crash', () => {
  for (const sample of ['[a](', '[x](((', '****', '``', '![x](', '[[]]]', '#####', '\u0000', '---\n- a\n> quote']) {
    assert.doesNotThrow(() => render(sample), sample);
  }
});
test('max document length enforced', () => {
  const inst = new MD({ maxInputLength: 50 });
  assert.throws(() => inst.parse('A'.repeat(51)), RangeError);
});
test('long single lines guarded', () => assert.throws(() => render('x'.repeat(65537)), RangeError));
test('untrusted SVG/script inside Mermaid fence remains code text', () => {
  const html = render('```mermaid\nA[<img src=x onerror=alert(1)>] --> B\n```');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<svg'));
  assert.ok(!html.includes('<img'));
});
test('large linear plain text does not explode', () => {
  const sample = ('A simple line with 12345 text.\n\n').repeat(10000);
  assert.ok(render(sample).length > 100000);
});

for (const lang of ['javascript', 'python', 'bash', 'html', 'css', 'ini', 'php']) {
  test(`original ${lang} mode is available and HTML-safe`, () => {
    const html = render(`\`\`\`${lang}\n<img src=x onerror=alert(1)>\n\`\`\``);
    assert.ok(html.includes(`md-code-syntax-lang-${lang}`));
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('<script'));
  });
}
test('safe custom highlighter deliberately receives tokens rather than HTML', () => {
  const plugin = new MD({ mode: 'extended' });
  plugin.registerCodeHighlight('rust', code => [{ text: code, type: 'symbol' }]);
  assert.ok(plugin.parse('```rust\nfn main() { <b> }\n```').includes('&lt;b&gt;'));
});
test('sanitization adversarial corpus (deterministic transformations)', () => {
  const payloads = [
    '<svg/onload=alert(1)>', '<img src=x onerror=alert(1)>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '</a><script>alert(1)</script>',
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:alert(1)',
    'https://test/?x=" onclick="alert(1)',
    '&amp;#58;', '&quot;', '\u0000'
  ];
  for (let i = 0; i < 350; i++) {
    const payload = payloads[i % payloads.length];
    const context = i % 7;
    const input = [payload, `# ${payload}`, `**${payload}**`,
      `\`${payload}\``, `| Name | Value |\n| --- | --- |\n| p | ${payload} |`,
      `[bad](${payload})`, `![bad](${payload})`][context];
    const output = render(input);
    assert.ok(!/<(?:script|iframe|svg|style|object|embed|form)(?=[\s/>])/i.test(output), output);
    for (const tag of output.match(/<[^>]*>/g) || []) {
      assert.ok(!/\s(?:onload|onerror|onclick)\s*=/i.test(tag), tag);
    }
    assert.ok(!/(?:href|src)="(?:javascript|data|vbscript):/i.test(output), output);
  }
});

test('hostile unmatched link delimiters are handled without a quadratic storm', () => {
  const source = '['.repeat(20000);
  const begin = Date.now();
  const html = render(source);
  assert.ok(html.includes('['));
  assert.ok(Date.now() - begin < 3000, 'excessive time on an unmatched-bracket input');
});
