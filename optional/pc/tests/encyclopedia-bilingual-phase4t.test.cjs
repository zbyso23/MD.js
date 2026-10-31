'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../../..');let ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dir,'MD-Encyclopedia-Data.js'),'utf8'),ctx);
const articles=ctx.window.MDEncyclopediaChapters;
test('CS/EN metadata for every entry and substantive translated new articles',()=>{
 assert.equal(articles.length,88);assert.equal(new Set(articles.map(a=>a.id)).size,88);
 for(const a of articles){assert.ok(a.title_en&&a.summary_en&&a.body_en,a.id);}
 for(const a of articles.filter(a=>a.id.startsWith('ref-')&&!a.id.startsWith('ref-archive'))){assert.ok(a.body_en.length>80,a.id);assert.notEqual(a.body,a.body_en,a.id);}
});
test('seven original full archival texts bundled as UTF-8',()=>{
 const files=fs.readdirSync(path.join(dir,'reference/historical'));
 assert.equal(files.length,7);
 for(const f of files){const s=fs.readFileSync(path.join(dir,'reference/historical',f),'utf8');assert.ok(s.length>10000);assert.ok(!s.includes('\ufffd'),f);}
});
test('offline bilingual UI supports switching',()=>{
 const code=fs.readFileSync(path.join(dir,'MD-Encyclopedia.js'),'utf8');
 assert.match(code,/language\.addEventListener\('click'/);
 assert.match(code,/bodyOf\(c\)/);
 assert.match(code,/titleOf\(c\)/);
 assert.doesNotMatch(code,/fetch\(/);
});
