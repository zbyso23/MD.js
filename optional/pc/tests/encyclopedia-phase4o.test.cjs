'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const data=fs.readFileSync(path.join(root,'MD-Encyclopedia-Data.js'),'utf8');
const context={window:{}};vm.runInNewContext(data,context);const all=context.window.MDEncyclopediaChapters;
test('two sections with category structure, unique ids and substantive text',()=>{
 assert.deepEqual([...new Set(all.map(x=>x.section))].sort().join(','),'Assembler,Markdown');
 assert.ok(all.length>=24, 'minimum 24 lessons');
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 for(const c of all){assert.ok(c.category&&c.title&&c.summary&&c.body.length>120,c.id);assert.ok(c.level==='tested'||c.level==='reference');}
 assert.ok(new Set(all.filter(x=>x.section==='Assembler').map(x=>x.category)).size>=7);
 assert.ok(new Set(all.filter(x=>x.section==='Markdown').map(x=>x.category)).size>=4);
});
test('complete HGC/VGA/CGA/OPL source identical to tested repo',()=>{
 const originals={'xt-hgc-fractal':'optional/pc/phase4/HGCFRAC.s','xt-cga-fractal':'optional/pc/phase4/CGAFRAC.s','at-vga-mandel':'optional/pc/phase4/MANDEL.s','opl2-music':'optional/pc/phase3/TUNE.s'};
 for(const [id,name] of Object.entries(originals)){
  const c=all.find(x=>x.id===id);assert.ok(c&&c.source,id);assert.equal(c.source,fs.readFileSync(path.join(root,name),'utf8'));assert.ok(c.body.includes(c.source.trim()),id);
  assert.equal(c.level,'tested');
 }
});
test('unverified hardware examples clearly mark limitations',()=>{
 for(const id of ['sb-dma','tsr','custom-int','286-protected']){
  const c=all.find(x=>x.id===id);assert.ok(c&&c.level==='reference',id);assert.match(c.body,/neotestovan|referenč|nikoli potvrzen|pouze reference|reference-only/i);
 }
});
test('F2 icon and file-relative local scripts in all interactive entrypoints',()=>{
 const pages=['index.html','optional/pc/index.html','zx-ultra.html','examples/index.html','examples/charts.html','examples/reader.html','optional/blockly/index.html','zx-in-markdown.html','zx-screen-demo.html'];
 for(const p of pages){const html=fs.readFileSync(path.join(root,p),'utf8');assert.match(html,/MD-Encyclopedia\.js/);assert.match(html,/MD-Encyclopedia-Data\.js/);assert.doesNotMatch(html,/https?:\/\/[^'" ]+MD-Encyclopedia/i);}
 const core=fs.readFileSync(path.join(root,'MD-Encyclopedia.js'),'utf8');assert.match(core,/keydown/);assert.match(core,/Escape/);assert.match(core,/fullscreenchange/);assert.match(core,/isEditing/);
});
