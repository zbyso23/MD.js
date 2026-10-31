const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,F}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(b,max)=>{const x=new Uint8Array(Buffer.from(b,'base64'));if(x.length>max)throw Error('oversize');return x;}};
function bios(p,adapter,ah,al=0,setup=()=>{}){
 const m=new PCMachine(p,{videoAdapter:adapter}),c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;
 setup(m,c);m.ram.set([0xb8,al,ah,0xcd,0x10,0xf4],0x2000);
 const r=m.run(100);assert.equal(r.halted,true);assert.equal(c.r[R.SP],0x7000);
 return m;
}
for(const profile of ['xt','at']){
 test(`${profile}: CGA INT10 mode03, text character via guest interrupt and IRET`,()=>{
  const m=bios(profile,'cga',0x00,3);assert.equal(m.video.mode,3);assert.equal(m.read8(0x449),3);
  const c=m.cpu;c.halted=false;c.loadSegment(S.CS,0);c.ip=0x2100;c.ram=undefined;
  m.ram.set([0xb8,0x41,0x0e,0xcd,0x10,0xf4],0x2100);m.run(100);
  assert.deepEqual(m.video.readCell(0,0),{char:0x41,attr:7});
  assert.equal(m.read8(0xb8000),0x41);assert.equal(m.read8(0xb8001),7);
  assert.equal(m.video.cursor[1],1);assert.ok(m.biosCalls.includes(0x10));
 });
 test(`${profile}: CGA graphics mode4 banked VRAM 2-bits per pixel`,()=>{
  const m=bios(profile,'cga',0,4);
  assert.deepEqual(m.video.dimensions,[320,200]);
  assert.equal(m.video.setPixel(0,0,3),true);assert.equal(m.read8(0xb8000),0xc0);
  assert.equal(m.video.setPixel(4,1,2),true);assert.equal(m.read8(0xba001),0x80);
  assert.equal(m.video.getPixel(4,1),2);
  m.write8(0xb8000,0x1b);assert.deepEqual([0,1,2,3].map(x=>m.video.getPixel(x,0)),[0,1,2,3]);
  assert.equal(m.video.setPixel(320,0,1),false);
 });
 test(`${profile}: CGA mode6 640x200 one-bit pixels and port palette`,()=>{
  const m=bios(profile,'cga',0,6);
  m.out8(0x3d9,0x1f);assert.equal(m.in8(0x3d9),0x1f);
  m.video.setPixel(639,199,1);
  assert.equal(m.video.getPixel(639,199),1);
  assert.equal(m.read8(0xb8000+0x2000+99*80+79)&1,1);
 });
 test(`${profile}: Hercules 720x348 4-bank graphics and mono text`,()=>{
  const m=bios(profile,'hercules',0,7);
  assert.equal(m.video.mode,7);assert.equal(m.video.textCols,80);
  m.write8(0xb0000,0x48);assert.equal(m.video.readCell(0,0).char,0x48);
  m.out8(0x3bf,3);m.out8(0x3b8,0x0a);
  assert.deepEqual(m.video.dimensions,[720,348]);
  for(let y=0;y<4;y++)assert.equal(m.video.setPixel(0,y,1),true);
  for(let y=0;y<4;y++)assert.equal(m.read8(0xb0000+y*0x2000)&0x80,0x80);
  m.video.setPixel(719,347,1);assert.equal(m.video.getPixel(719,347),1);
  assert.equal(m.video.getPixel(720,0),null);
 });
 test(`${profile}: INT10 AH09 repeated text, cursor set/read and mode query`,()=>{
  const m=bios(profile,'cga',9,0x5a,(_m,c)=>{c.put8(3,0x1e);c.r[R.CX]=3;});
  for(let col=0;col<3;col++)assert.deepEqual(m.video.readCell(0,col),{char:90,attr:0x1e});
  assert.deepEqual(m.video.cursor,[0,0]);
  // BIOS cursor position (DH row, DL col, BH page)
  let c=m.cpu;c.halted=false;c.loadSegment(S.CS,0);c.ip=0x2100;m.ram.set([0xb8,0,2,0xcd,0x10,0xf4],0x2100);c.r[R.DX]=0x040a;m.run(100);
  assert.deepEqual(m.video.cursor,[4,10]);
  c.halted=false;c.ip=0x2200;m.ram.set([0xb8,0,3,0xcd,0x10,0xf4],0x2200);m.run(100);
  assert.equal(c.r[R.DX],0x040a);
  c.halted=false;c.ip=0x2300;m.ram.set([0xb8,0,15,0xcd,0x10,0xf4],0x2300);m.run(100);
  assert.equal(c.get8(0),3);assert.equal(c.get8(4),80);
 });
 test(`${profile}: video snapshot round-trip and independent system-RAM ceiling`,()=>{
  const m=new PCMachine(profile,{videoAdapter:'hercules'});
  m.out8(0x3b8,0x0a);m.video.setPixel(80,11,1);
  const state=m.exportState(codec),copy=PCMachine.fromState(state,codec);
  assert.equal(copy.video.adapter,'hercules');assert.equal(copy.video.getPixel(80,11),1);
  assert.equal(copy.video.vram.length,65536);
  assert.equal(copy.conventional+copy.extended,profile==='xt'?640*1024:1024*1024);
  assert.equal(m.in8(0x3d8),0xff); // inactive adapter ports
 });
 test(`${profile}: no inserted floppy, INT13 still fails closed`,()=>{
  const m=new PCMachine(profile);const c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;
  m.ram.set([0xb8,0,2,0xcd,0x13,0xf4],0x2000);m.run(100);
  assert.ok(c.flags&F.CF);assert.equal(c.get8(4),0x80);
 });
}
