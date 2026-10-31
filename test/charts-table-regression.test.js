'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const MD=require('../MD.js');
const Charts=require('../MD-Charts.js');
const md=new MD({mode:'extended'});
for(const marker of ['-|--|--','---|---|---']){
  test('short GFM delimiter is parsed into table: '+marker,()=>{
    const sep=marker==='-|--|--'?'|:--|--:|--:|':'|:---|---:|---:|';
    const html=md.parse('| Projekt | Body | Cena |\n'+sep+'\n| ZX | 9 | 18 |\n| Blockly | 2 | 3 |');
    assert.match(html,/<table class="md-table">/);
    assert.match(html,/<thead>/);
    assert.match(html,/<tbody>/);
    assert.match(html,/<td class="md-align-right">9<\/td>/);
    assert.ok(!html.includes('<pre'));
  });
}
test('single hyphen GFM alignment renders',()=>assert.match(md.parse('| A | B |\n|:-|-:|\n| x | 2 |'),/<table class="md-table">/));
test('ordinary text remains text',()=>assert.ok(!md.parse('| X | Y |\n| wrong | text |').includes('<table')));
for(const type of ['bar','bar-horizontal','line','pie'])test('chart parse '+type,()=>{
  const spec=Charts.parse('type: '+type+'\ntitle: Values\nx: Time\ny: Qty\ndata:\nA: 4\nB: 8');
  assert.equal(spec.data.length,2);
  assert.equal(spec.title,'Values');
  assert.equal(typeof spec.type,'string');
});
test('chart output is opt-in and always escaped',()=>{
  const result=md.parse('~~~chart\ntype: bar\ndata:\n<script>: 123\n~~~');
  assert.match(result,/data-md-chart="true"/);
  assert.ok(result.includes('&lt;script&gt;'));
  assert.ok(!result.includes('<script>'));
});
test('chart source fallback if optional JS not loaded',()=>assert.match(md.parse('~~~chart\ntype: bar\n~~~'),/<pre/));
test('chart protects limits and rejects malformed/negative values',()=>{
  for(const v of ['type: evil\ndata:\nA: 1','type: bar\ndata:\nA: -1','type: pie\ndata:\nA: 0','data:\nA: Infinity','data:\nA: 2\n<svg onload=x>'])assert.throws(()=>Charts.parse(v));
});
test('chart accepts large 24 slices but not 25',()=>{
  const mk=n=>'type: pie\ndata:\n'+Array.from({length:n},(_,i)=>`Slice${i}: ${i+1}`).join('\n');
  assert.equal(Charts.parse(mk(24)).data.length,24);
  assert.throws(()=>Charts.parse(mk(25)));
});
