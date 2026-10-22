'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const MD=require('../MD.js');const UX=require('../MD-docux.js');
function parse(s){return new MD({mode:'extended'}).parse(s);}
test('ES6 test surface — no dependencies and no execution',()=>{
 assert.equal(typeof UX.enhance,'function');assert.equal(typeof UX.scoreText,'function');
 assert.equal(typeof UX.standaloneSVG,'function');
});
test('typo tolerance — insertion deletion substitution transposition',()=>{
 const target='mermaid';
 assert.equal(UX.distance(target,'mermai',2),1);
 assert.equal(UX.distance(target,'mermmaid',2),1);
 assert.equal(UX.distance(target,'mermeid',2),1);
 assert.equal(UX.distance(target,'mermiad',2),1);
 assert.equal(UX.distance(target,'merrmaid',2),1);
 assert.equal(UX.distance('abcdefghi','abcxxfghi',2),2);
 assert.ok(UX.scoreText('Vlastní Mermaid renderer v JS','merrmaid')<Infinity);
 assert.ok(UX.scoreText('Příjem v nemocnici','prijem')<Infinity);
 assert.ok(UX.scoreText('Interaktivní tabulky','interktivni')<Infinity);
 assert.equal(UX.scoreText('Vzácné slovo','kryptografie'),Infinity);
 assert.equal(UX.scoreText('rozsáhlá dokumentace','x'),Infinity);
});
test('short queries are intentionally strict',()=>{
 assert.equal(UX.scoreText('Alpha beta','a'),0);
 assert.equal(UX.scoreText('Alpha beta','xy'),Infinity);
});
test('no unsafe URL or HTML in details/faq bodies',()=>{
 const html=parse(':::details FAQ <img src=x onerror=alert(1)>\n**Odpověď** [útok](javascript:alert(2))\n:::');
 assert.match(html,/<details class="md-details">/);
 assert.match(html,/<summary>FAQ &lt;img/);
 assert.match(html,/<strong/);
 assert.doesNotMatch(html,/<img |href="javascript:/);
});
test('details preserve markdown and have bounded unclosed fallback',()=>{
 const out=parse(':::faq A co ZX?\nOdpověď **ano**.\n:::');
 assert.match(out,/<summary>A co ZX\?</);
 assert.match(out,/<strong/);
 const unclosed=parse(':::details A\nText');
 assert.doesNotMatch(unclosed,/<details/);
});
test('tabs fence is never interpreted as script or HTML',()=>{
 const s='~~~code-tabs\n::: js | JS\n<script>alert(1)</script>\n::: python | Python\nprint("Hello")\n~~~';
 const html=parse(s);assert.match(html,/data-md-code-tabs="true"/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});
test('diff blocks remain escaped',()=>{
 const html=parse('~~~diff\n+ <img src=x onerror=1>\n- bad\n~~~');
 assert.match(html,/md-code-syntax-lang-diff/);
 assert.match(html,/&lt;img src/);
});
test('numeric columns sort correctly including decimal commas',()=>{
 assert.ok(UX.compareCells('9','20')<0);
 assert.ok(UX.compareCells('3,5','11,2')<0);
 assert.ok(UX.compareCells('A9','A10')<0);
});
test('document index scoring bounds and denial-of-service guard',()=>{
 const t='render'.repeat(1000);
 assert.ok(UX.scoreText(t,'renderer')===Infinity);
 const a='a'.repeat(4000);assert.equal(UX.scoreText(a,'zzzzzz'),Infinity);
});
