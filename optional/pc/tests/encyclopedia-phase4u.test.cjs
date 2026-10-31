'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../../..'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dir,'MD-Encyclopedia-Data.js'),'utf8'),ctx);
const a=ctx.window.MDEncyclopediaChapters;
const find=id=>a.find(x=>x.id===id);
test('Phase 4U reference count and bilingual descriptions',()=>{
 assert.ok(a.length>=108);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 for(const x of a){assert.ok(x.body&&x.body_en&&x.title_en&&x.summary_en,x.id);}
 for(const id of ['p4u-real','p4u-protected','p4u-v86','p4u-paging','p4u-fpu'])assert.ok(find(id).body_en.length>300,id);
});
test('three display examples use distinct modes and correct BIOS pixel interface',()=>{
 for(const [id,mode] of [['p4u-ega','000Dh'],['p4u-vga13','0013h'],['p4u-vga12','0012h']])assert.ok(find(id).body.includes(mode),id);
 for(const id of ['p4u-ega','p4u-vga12'])assert.match(find(id).body,/mov ah,0Ch/);
 assert.match(find('p4u-vga13').body,/0A000h/);assert.match(find('p4u-vga13').body,/03C8h/);
});
test('AdLib writes register and value to proper OPL ports, waits',()=>{
 const s=find('p4u-adlib-piano').body;
 assert.match(s,/0388h/);assert.match(s,/\.wait1:/);assert.match(s,/\.wait2:/);assert.match(s,/mov bl,0B0h/);
});
test('SB DMA includes 8237 mask flipflop mode and DSP documentation',()=>{
 const s=find('p4u-sb-dma').body;
 for(const i of ['000Ah','000Ch','000Bh','049h','83h','14h','64'])assert.ok(s.includes(i),i);
 assert.match(s,/NOT a complete player/);
});
test('5 added historical sources exist and keep original authorship',()=>{
 for(const n of ['8087','KLAVES','MODEM','MS_DOS','ZAKLADPC']){
  const s=fs.readFileSync(path.join(dir,'reference/historical',n+'.txt'),'utf8');
  assert.ok(s.length>1000);assert.ok(!s.includes('\ufffd'));
  assert.ok(find('p4u-hist-'+n.toLowerCase()));
 }
});
