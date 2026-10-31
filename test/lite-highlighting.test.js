const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const MD = require('../MD.js');
const md = new MD({highlight:true,mode:"extended"});
const suite = [
 ['javascript','const x = "green"; // comment',['command','symbol','comment']],
 ['python','def hello():\n  return "hi" # comment',['command','symbol','comment']],
 ['html','<div class="box">Hello</div>',['command','attribute-name','attribute-value']],
 ['css','.box { color: #123456; } /* comment */',['attribute-name','attribute-value','comment']],
 ['ini','[section]\nfoo="bar"\n; comment',['command','attribute-name','attribute-value','comment']],
 ['bash','echo "hi" # comment',['command','symbol','comment']],
 ['json','{"key": 123}',['symbol','controls']],
 ['php','<?php echo "hi";',['command','symbol']],
];
for(const [lang,code,expected] of suite) test(`${lang}: original color tokens`,()=>{
  const html=md.parse('```'+lang+'\n'+code+'\n```');
  for(const type of expected) assert.match(html,new RegExp('md-code-syntax-'+type));
  assert.match(html,/<pre class="md-code/);
});
test('highlighting has distinct nonblank palette colors and preserve dark block readability',()=>{
 const css=fs.readFileSync(require('node:path').join(__dirname,'../MD.css'),'utf8');
 const colors=['command','controls','symbol','comment','attribute-name','attribute-value'].map(t=>{
  const m=css.match(new RegExp('\\.md-root \\.md-code-syntax-'+t+' \\{ color: (#[0-9a-fA-F]{6})'));
  assert.ok(m,'missing CSS token color: '+t);return m[1];
 });
 assert.equal(new Set(colors).size,6);
 assert.match(css,/background: var\(--md-code-bg\)/);
});
test('code fence escapes HTML instead of executing it',()=>{
 const html=md.parse('```javascript\n<script>alert(1)</script>\n```');
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('unknown language does not fabricate token classes',()=>{
 const html=md.parse('```unrecognized\nxyz 123\n```');
 assert.ok(!html.includes('md-code-syntax-command'));
});
