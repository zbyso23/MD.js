'use strict';
// Focused tests for defects that the previous unit/E2E gates did not catch.
// GPL-3.0-only; native Node test runner (no runtime dependencies).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {PCMachine,PIC8259,PIT8253,DMA8237} = require('../PC-Machine.js');
const {PCFPU287} = require('../PC-FPU287.js');
const {S,R} = require('../PC-Core.js');
const fs=require('node:fs'),path=require('node:path');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('too large');return new Uint8Array(b);}};
function x87(code,st1,st0){
 const m=new PCMachine('at',{fpuEnabled:true});const c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;c.halted=false;
 m.ram.set([...code,0xf4],0x2000);
 m.fpu.push(st1);m.fpu.push(st0);m.run(10);return {v:m.fpu.get(),m};
}
test('x87 FSUBP DE E9 computes ST1-ST0, not opposite',()=>assert.equal(x87([0xde,0xe9],9,4).v,5));
test('x87 FSUBRP DE E1 computes ST0-ST1',()=>assert.equal(x87([0xde,0xe1],9,4).v,-5));
test('x87 FDIVP DE F9 computes ST1/ST0',()=>assert.equal(x87([0xde,0xf9],9,3).v,3));
test('x87 FDIVRP DE F1 computes ST0/ST1',()=>assert.equal(x87([0xde,0xf1],9,3).v,1/3));
test('x87 FCOM clears stale C1 condition flag',()=>{const f=new PCFPU287(true);f.status=0x0200;f.compare(5,4);assert.equal(f.status&0x0200,0);});
test('PIT latch command preserves programmed access mode and captures stable counter',()=>{
 const p=new PIT8253(new PIC8259());p.control(0x34);p.write(0,0x34);p.write(0,0x12);p.value[0]=0x1234;
 p.control(0x00);assert.equal(p.access[0],3);
 p.advance(10);assert.equal(p.read(0),0x34);assert.equal(p.read(0),0x12);
 assert.equal(p.read(0),0x2a);assert.equal(p.read(0),0x12);
});
test('DMA terminal-count status clears on status-port read',()=>{const d=new DMA8237();d.status=0x05;assert.equal(d.read(8)&15,5);assert.equal(d.read(8)&15,0);});
test('PC snapshot rejects PIC out-of-range mask and corrupt IRQ priority registers',()=>{
 const m=new PCMachine('at'),s=m.exportState(codec);s.pic.mask=999;
 assert.throws(()=>PCMachine.fromState(s,codec),/PIC/);
});
test('nonfinite x87 snapshot values survive portable JSON without becoming null or strings',()=>{
 const f=new PCFPU287(true);f.push(Number.POSITIVE_INFINITY);f.push(Number.NaN);
 const s=JSON.parse(JSON.stringify(f.snapshot()));const restored=new PCFPU287();restored.restore(s);
 assert.ok(Number.isNaN(restored.get()));assert.equal(restored.get(1),Infinity);
});
test('PIT advances a huge tick interval in bounded time and requests only one pending IRQ',()=>{
 const pic=new PIC8259(),p=new PIT8253(pic);p.control(0x34);p.write(0,1);p.write(0,0);
 const t=performance.now();p.advance(25000000);
 assert.ok(performance.now()-t<1500,'PIT must not loop per period');
 assert.equal(p.value[0],1);assert.equal(pic.irr&1,1);
});
test('fixed MANDEL source is installed on FAT12 disk and matches embedded disk bytes',()=>{
 const pc=path.join(__dirname,'..'),image=fs.readFileSync(path.join(pc,'x86BOOT-720K-DEBUG-DEV.img'));
 const diskFile=fs.readFileSync(path.join(pc,'phase4/MANDEL.COM'));
 const bps=image.readUInt16LE(11),spf=image.readUInt16LE(22),spc=image[13],reserved=image.readUInt16LE(14),fats=image[16],entries=image.readUInt16LE(17);
 const root=(reserved+fats*spf)*bps,dataStart=root+Math.ceil(entries*32/bps)*bps;
 let found=0;
 for(let i=0;i<entries;i++){const off=root+i*32;if(image.subarray(off,off+11).toString('ascii')!=='MANDEL  COM')continue;
  found++;const size=image.readUInt32LE(off+28),cl=image.readUInt16LE(off+26),begin=dataStart+(cl-2)*spc*bps;
  assert.equal(size,diskFile.length);assert.deepEqual(image.subarray(begin,begin+size),diskFile);
 }
 assert.equal(found,1);
});
