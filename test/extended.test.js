'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MD = require('../MD.js');
const md = new MD({mode:'extended'});
const render = source => md.parse(source);
const contains = (source, fragment) => assert.ok(render(source).includes(fragment), `${JSON.stringify(source)} missing ${JSON.stringify(fragment)}`);
const absent = (source, fragment) => assert.ok(!render(source).includes(fragment), `${JSON.stringify(source)} must exclude ${JSON.stringify(fragment)}`);

for (const marker of ['- [x] complete','* [X] complete','+ [x] complete','1. [x] complete']) {
  test(`tasklist checked: ${marker}`, () => {
    const html = render(marker); assert.match(html, /<li class="md-task-item"><input type="checkbox" disabled checked/);
    assert.ok(html.includes('complete'));
  });
}
test('task list empty, immutable, no forms or event attributes', () => {
  const html = render('- [ ] waiting\n- [x] finished');
  assert.equal((html.match(/type="checkbox"/g) || []).length,2);
  assert.equal((html.match(/ disabled/g) || []).length,2);
  assert.equal((html.match(/ checked/g) || []).length,1);
  assert.ok(!html.includes('<form'));
});
test('literal code with task syntax is never parsed', () => contains('````md\n- [x] nope\n````','- [x] nope'));
test('task list inside a quoted block', () => contains('> - [x] success','type="checkbox" disabled checked'));
test('basic mode preserves literal task markers', () => {
  const html = new MD().parse('- [x] not a checkbox');
  assert.ok(!html.includes('type="checkbox"')); assert.ok(html.includes('[x]'));
});

test('full reference link with title', () => {
  const html = render('Read [project][DOC].\n\n[doc]: https://example.org "x &copy;"');
  assert.ok(html.includes('href="https://example.org"')); assert.ok(html.includes('title="x ©"'));
});
test('collapsed and shortcut reference forms', () => {
  const html = render('[a][] + [a]\n\n[a]: /README.md');
  assert.equal((html.match(/href="\/README.md"/g) || []).length, 2);
});
test('reference names are case-insensitive and normalize whitespace', () => {
  contains('[Title][ SOME  NAME ]\n\n[Some Name]: /file', 'href="/file"');
});
test('image reference alt safely escaped', () => {
  const html = render('![<x>][photo]\n\n[photo]: https://example.net/x.png');
  assert.ok(html.includes('alt="&lt;x&gt;"'));
  assert.ok(html.includes('src="https://example.net/x.png"'));
});
test('unsafe reference schemes remain inert', () => {
  const html = render('[go][evil]\n\n[evil]: javascript:alert(1)');
  assert.ok(!html.includes('<a')); assert.ok(!html.includes('href="javascript:'));
});
test('entity-obfuscated unsafe reference rejected after decoding', () => {
  const html = render('[a][x]\n\n[x]: javascript&#58;alert(1)');
  assert.ok(!html.includes('<a'));
});
test('definitions fenced as code do not participate', () => {
  const html = render('```\n[r]: /x\n```\n\n[r]');
  assert.ok(!html.includes('<a')); assert.ok(html.includes('[r]'));
});
test('reference definitions cleared per parse', () => {
  render('[r]: /exists\n\n[r]');
  absent('[r]', '<a');
});
test('first duplicate reference definition takes precedence', () => {
  const html = render('[x]\n\n[x]: /one\n[x]: /two');
  assert.ok(html.includes('href="/one"')); assert.ok(!html.includes('href="/two"'));
});
test('basic mode keeps reference definitions visible', () => {
  assert.ok(new MD().parse('text\n\n[a]: /url').includes('[a]: /url'));
});
test('notes have named backlinks and render emphasis', () => {
  const html = render('X[^first].\n\n[^first]: This is **important**.');
  assert.match(html, /class="md-footnote-ref"/); assert.match(html, /class="md-footnotes"/);
  assert.match(html, /href="#mdfnref-\d+-1-1"/);
  assert.match(html, /<strong class="md-strong">important<\/strong>/);
});
test('notes are numbered in order of appearance and support repeated citations', () => {
  const html = render('B[^b], A[^a], B again[^b]\n\n[^a]: A body\n[^b]: B body');
  assert.equal((html.match(/aria-label="Poznámka 1"/g)||[]).length, 2);
  assert.equal((html.match(/aria-label="Poznámka 2"/g)||[]).length, 1);
  assert.match(html, /mdfnref-\d+-1-2/);
});
test('missing note remains literal', () => {
  const html = render('Missing[^none]');
  assert.ok(!html.includes('md-footnotes')); assert.ok(html.includes('[^none]'));
});
test('definitions reset across parse calls', () => {
  render('X[^a]\n\n[^a]: note');
  const html = render('No notes here'); assert.ok(!html.includes('md-footnotes'));
});
test('two parser instances use separate anchor ID prefixes', () => {
  const a = new MD({mode:'extended'}).parse('A[^n]\n\n[^n]: test');
  const b = new MD({mode:'extended'}).parse('A[^n]\n\n[^n]: test');
  const x = /id="mdfn-(\d+)-1"/.exec(a); const y = /id="mdfn-(\d+)-1"/.exec(b);
  assert.ok(x && y); assert.notEqual(x[1], y[1]);
});
test('reference cannot create executable content in footnote', () => {
  const html= render('X[^x]\n\n[^x]: <svg onload=alert(1)> [bad](javascript:alert(1))');
  assert.ok(!html.includes('<svg')); assert.ok(html.includes('&lt;svg onload='));
});
test('footnotes in code do not become live links', () => {
  const html=render('`[^x]`\n\n[^x]: text');
  assert.ok(!html.includes('md-footnotes'));
});
test('multiline note definition accepts indented continuation', () => {
  const html=render('X[^note]\n\n[^note]: line one\n    line two');
  assert.ok(html.includes('line one line two'));
});

for (const type of ['NOTE','TIP','IMPORTANT','WARNING','CAUTION']) {
  test(`GitHub alert ${type}`, () => contains(`> [!${type}]\n> Details **here**`, `md-alert-${type.toLowerCase()}`));
}
test('unknown GitHub alert becomes ordinary quote', () => {
  contains('> [!RANDOM]\n> test','md-blockquote'); absent('> [!RANDOM]\n> test','md-alert-');
});
test('rendering an alert does not allow hostile tags', () => {
  const html=render('> [!WARNING]\n> <img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img'));
});
test('hard line break via backslash at EOL', () => contains('line one\\\nline two', 'line one<br>line two'));
test('entity names and decimal numeric entities decode exactly once', () => {
  const html=render('&copy; &#169; &amp;lt;');
  assert.ok(html.includes('© © &amp;lt;'));
});
test('HTML entity decoded tag is re-escaped', () => {
  contains('&#60;script&#62;', '&lt;script&gt;'); absent('&#60;script&#62;', '<script>');
});
test('invalid numeric entity becomes replacement char', () => contains('&#0; and &#x110000;', '� and �'));
test('entities inside code are not decoded', () => contains('`&copy;`','&amp;copy;'));
test('bare HTTP URL autolink trims trailing punctuation', () => {
  const html=render('See https://example.org/file?q=1, thanks');
  assert.ok(html.includes('href="https://example.org/file?q=1"')); assert.ok(html.includes('</a>, thanks'));
});
test('www autolink uses https', () => contains('www.example.org', 'href="https://www.example.org"'));
test('balanced parentheses are kept, stray closing bracket dropped', () => {
  contains('https://example.org/a(b)', 'href="https://example.org/a(b)"');
  contains('(https://example.org/a(b))', 'href="https://example.org/a(b)"');
});
test('inline code disables bare autolinking', () => {
  const html=render('`https://example.org`'); assert.ok(!html.includes('<a'));
});
test('no automatic HTML from bare protocols not allowed', () => {
  const html=render('javascript:alert(1) data:text/html,<h1>'); assert.ok(!html.includes('<a'));
});
test('large list of HTML alert payloads cannot inject scripts/events', () => {
  for (let i=0;i<100;i++) {
    const p=['<script>alert(1)</script>', '<svg onload=alert(1)>','[x][url]\n\n[url]: javascript&#58;alert(1)'][i%3];
    const html=render(`> [!NOTE]\n> ${p}`);
    assert.ok(!/<(?:script|svg)(?=[\s/>])/i.test(html));
    assert.ok(!/href="javascript:/i.test(html));
  }
});
