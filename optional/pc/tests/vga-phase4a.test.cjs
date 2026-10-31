'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{S,R,F}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('too big');return new Uint8Array(b);}};
function runGuest(m,bytes,at=0x2000){const c=m.cpu;c.loadSegment(S.CS,0);c.ip=at;c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;c.halted=false;m.ram.set(bytes,at);const res=m.run(20000);assert.equal(res.halted,true);return c;}
test('XT never acquires VGA, AT retains 1 MiB installed system RAM cap',()=>{
 assert.throws(()=>new PCMachine('xt',{videoAdapter:'vga'}),/AT\/286/);
 const m=new PCMachine('at',{videoAdapter:'vga'});
 assert.equal(m.conventional+m.extended,1024*1024);assert.equal(m.video.vram.length,256*1024);
 assert.equal(m.read8(0xa0000),255);assert.equal(m.video.mode,3);
 assert.equal(m.video.dimensions.join('x'),'720x400');
});
test('AT VGA text-mode FreeDOS-compatible B8000 cells remain readable',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});
 runGuest(m,[0xb8,0x41,0x0e,0xcd,0x10,0xf4]);
 assert.equal(m.read8(0xb8000),0x41);assert.equal(m.video.readCell(0,0).char,0x41);
});
test('real guest INT10 Mode 13h and REP STOSB write to chained A000 VRAM',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});
 const cpu=runGuest(m,[0xb8,0x13,0x00,0xcd,0x10,0xb8,0x00,0xa0,0x8e,0xc0,0x31,0xff,0xb0,0x4c,0xb9,0x08,0x00,0xf3,0xaa,0xf4]);
 assert.equal(cpu.flags&F.CF,0);assert.equal(m.video.mode,0x13);assert.deepEqual(m.video.dimensions,[320,200]);
 for(let i=0;i<8;i++)assert.equal(m.video.getPixel(i,0),0x4c);
 assert.equal(m.video.getPixel(8,0),0);assert.equal(m.read8(0xa0000+7),0x4c);
 assert.equal(m.read8(0xb8000),255);
});
test('VGA DAC 3C8/3C9 guest port triplets update palette with 6-bit values and index auto-increment',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(0x13);
 runGuest(m,[0xba,0xc8,0x03,0xb0,0x2a,0xee,0x42,0xb0,0x3f,0xee,0xb0,0,0xee,0xee,0xf4]);
 assert.equal(m.video.palette(42),'#ff0000');assert.equal(m.video.dacWriteIndex,43);
 m.out8(0x3c7,42);assert.equal(m.in8(0x3c9),63);assert.equal(m.in8(0x3c9),0);assert.equal(m.in8(0x3c9),0);
});
test('Mode 12h four planar bytes, bit order and map mask write',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(0x12);
 assert.deepEqual(m.video.dimensions,[640,480]);
 m.write8(0xa0000,0x80);
 assert.equal(m.video.getPixel(0,0),15);assert.equal(m.video.getPixel(1,0),0);
 m.out8(0x3c4,2);m.out8(0x3c5,2);m.read8(0xa0000);
 m.write8(0xa0000,0x40);
 assert.equal(m.video.getPixel(0,0),13); // selected plane 1 cleared bit 7, others retained
 assert.equal(m.video.getPixel(1,0),2);
 assert.equal(m.video.getPixel(7,0),0);
});
test('VGA read-map select + graphics read mode 1 compare plane data',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(0x12);
 m.out8(0x3c4,2);m.out8(0x3c5,15);m.write8(0xa0000,0x80);
 m.out8(0x3ce,4);m.out8(0x3cf,3);assert.equal(m.read8(0xa0000),0x80);
 m.out8(0x3ce,2);m.out8(0x3cf,15);m.out8(0x3ce,7);m.out8(0x3cf,15);
 m.out8(0x3ce,5);m.out8(0x3cf,8);assert.equal(m.read8(0xa0000),0x80);
});
test('Guest INT10 pixel write/read for 12h and 13h, mode query',()=>{
 for(const mode of [0x12,0x13]){
  const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(mode);
  // MOV AX,0Cxy ; MOV CX,2 ; MOV DX,3 ; INT 10h ; MOV AX,0D00 ; INT 10h ; HLT
  const val=mode===0x12?0x0d:0x7c;
  const c=runGuest(m,[0xb8,val,0x0c,0xb9,2,0,0xba,3,0,0xcd,0x10,0xb8,0,0x0d,0xcd,0x10,0xf4]);
  assert.equal(c.get8(0),val);assert.equal(m.video.getPixel(2,3),val);
 }
});
test('VGA snapshot preserves DAC, video RAM, sequencer and per-plane registers',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(0x13);m.video.setPixel(319,199,93);
 m.out8(0x3c8,93);for(const x of [63,0,63])m.out8(0x3c9,x);
 m.out8(0x3c4,2);m.out8(0x3c5,9);
 const json=m.exportState(codec),reloaded=PCMachine.fromState(json,codec);
 assert.equal(reloaded.video.getPixel(319,199),93);assert.equal(reloaded.video.palette(93),'#ff00ff');assert.equal(reloaded.video.seq[2],9);
 json.video.vga.dac=codec.bytesToBase64(new Uint8Array(768).fill(255));assert.throws(()=>PCMachine.fromState(json,codec),/palette/);
});
test('Invalid VGA mode and video-memory addresses fail closed',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.video.setMode(0x12);
 assert.equal(m.video.setMode(0x14),false);assert.equal(m.video.mode,0x12);
 assert.equal(m.video.setPixel(640,0,2),false);assert.equal(m.video.getPixel(-1,5),null);
 const outside=m.read8(0xb0000);assert.equal(outside,255);m.write8(0xb0000,0xaa);assert.equal(m.read8(0xb0000),outside);
});
