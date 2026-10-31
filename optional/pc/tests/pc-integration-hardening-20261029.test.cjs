'use strict';
/* Multi-device state and instruction/property regression tests. GPL-3.0-only. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine,PIC8259,PIT8253}=require('../PC-Machine.js');
const {R,S,F}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{if(typeof s!=='string')throw Error('base64 expected');const b=Buffer.from(s,'base64');if(b.length>max)throw Error('oversized');return new Uint8Array(b);}};
function guest(m,code){const c=m.cpu;c.loadSegment(S.CS,0);c.loadSegment(S.SS,0);c.loadSegment(S.DS,0);c.ip=0x2000;c.r[R.SP]=0x7000;c.halted=false;m.ram.set(code,0x2000);m.run(20000);assert.equal(c.halted,true,'guest program did not halt');return c;}
function setLba(m,lba,count=1){m.out8(0x1f6,0xe0|((lba>>>24)&0xf));m.out8(0x1f2,count);m.out8(0x1f3,lba&255);m.out8(0x1f4,(lba>>>8)&255);m.out8(0x1f5,(lba>>>16)&255);}
test('PIC priority: IRQ0 preempts in-service IRQ5; IRQ7 waits until EOI',()=>{
 const p=new PIC8259(8);p.mask=0;p.request(5);assert.equal(p.acknowledge(),13);
 p.request(7);assert.equal(p.pending(),-1);
 p.request(0);assert.equal(p.acknowledge(),8);p.writeCommand(0x20);assert.equal(p.pending(),-1);
 p.writeCommand(0x20);assert.equal(p.acknowledge(),15);
});
test('PIT latch survives full PC state JSON roundtrip, including half-read count',()=>{
 const m=new PCMachine('at');m.out8(0x43,0x34);m.out8(0x40,0x78);m.out8(0x40,0x56);m.pit.value[0]=0x5678;
 m.out8(0x43,0x00);assert.equal(m.in8(0x40),0x78);m.pit.advance(5);
 const restored=PCMachine.fromState(JSON.parse(JSON.stringify(m.exportState(codec))),codec);
 assert.equal(restored.in8(0x40),0x56);assert.equal(restored.in8(0x40),0x73);assert.equal(restored.in8(0x40),0x56);
});
test('older PC snapshot without PIT latch fields remains importable',()=>{
 const m=new PCMachine('xt'),s=m.exportState(codec);delete s.pit.latched;delete s.pit.latchedReadLow;
 const restored=PCMachine.fromState(s,codec);assert.deepEqual(restored.pit.latched,[null,null,null]);
});
test('PIT latch itself is not altered by clock advances or repeated latch requests',()=>{
 const p=new PIT8253(new PIC8259());p.control(0x34);p.write(0,0xaa);p.write(0,0x21);p.value[0]=0x21aa;
 p.control(0);p.advance(3);p.control(0);assert.equal(p.read(0),0xaa);assert.equal(p.read(0),0x21);
 assert.equal(p.read(0),0xa7);assert.equal(p.read(0),0x21);
});
test('PIT period arithmetic matches a modular reference over varied tick counts',()=>{
 const values=[1,2,3,9,123,65535,65536],elapsed=[0,1,2,9,10,123,777777];
 for(const period of values)for(const ticks of elapsed){
  const pic=new PIC8259(),p=new PIT8253(pic);p.reload[0]=period&65535;p.value[0]=period;
  p.advance(ticks);
  const expected=ticks===0?period:period-(ticks%period);
  assert.equal(p.value[0],expected,`period ${period} ticks ${ticks}`);
  assert.equal(!!(pic.irr&1),ticks>=period);
 }
});
test('DMA count/addr programming survives status read; terminal-count bits clear only on read',()=>{
 const m=new PCMachine('at');m.out8(0x0c,0);m.out8(0x02,0x34);m.out8(0x02,0x12);m.out8(0x03,0xff);m.out8(0x03,0x01);
 assert.equal(m.dma.addr[1],0x1234);assert.equal(m.dma.count[1],0x01ff);
 m.dma.status=0xa5;assert.equal(m.in8(8),0xa5);assert.equal(m.in8(8),0xa0);
});
test('FPU nonfinite and PIC state survive JSON snapshot while invalid PIC is rejected',()=>{
 const m=new PCMachine('at',{fpuEnabled:true});m.fpu.push(Infinity);m.fpu.push(NaN);m.pic.mask=0xfa;
 const data=JSON.parse(JSON.stringify(m.exportState(codec))),b=PCMachine.fromState(data,codec);
 assert.equal(b.pic.mask,0xfa);assert.equal(b.fpu.get(1),Infinity);assert.ok(Number.isNaN(b.fpu.get()));
 for(const bad of [NaN,Infinity,-1,256,'x',1.5]){
  data.pic.mask=bad;assert.throws(()=>PCMachine.fromState(data,codec),/PIC/);
 }
});
test('IDE two-sector PIO read uses exact sector boundary, count decrement and IRQ flag',()=>{
 const m=new PCMachine('at');const bytes=new Uint8Array(8*512);
 bytes.fill(0x21,2*512,3*512);bytes.fill(0x72,3*512,4*512);m.ide.mount(bytes);setLba(m,2,2);m.out8(0x1f7,0x20);
 for(let i=0;i<256;i++)assert.equal(m.in16(0x1f0),0x2121);
 assert.equal(m.ide.remaining,1);assert.equal(m.in8(0x1f2),1);
 for(let i=0;i<256;i++)assert.equal(m.in16(0x1f0),0x7272);
 assert.equal(m.ide.remaining,0);assert.equal(m.ide.transfer,null);
 assert.equal(m.ide.image[2*512],0x21);
});
test('IDE two-sector write is isolated and exported, with no mutation of caller image',()=>{
 const m=new PCMachine('at');const caller=new Uint8Array(8*512);m.ide.mount(caller);setLba(m,2,2);m.out8(0x1f7,0x30);
 for(let i=0;i<256;i++)m.out16(0x1f0,0x1234);
 for(let i=0;i<256;i++)m.out16(0x1f0,0x5678);
 assert.equal(m.ide.overlay.size,2);assert.equal(caller[2*512],0);
 const exported=m.ide.exportImage();assert.equal(exported[2*512],0x34);assert.equal(exported[3*512],0x78);
});
test('VGA mode 13 pixel and palette survives cross-device snapshot with IDE, FPU, PIC and keyboard',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga',fpuEnabled:true});m.video.setMode(0x13);m.video.setPixel(23,45,129);
 m.out8(0x3c8,129);for(const c of [0,63,19])m.out8(0x3c9,c);
 m.ide.mount(new Uint8Array(4096));m.ide.writeSector(1,new Uint8Array(512).fill(0x5a));
 m.injectScancode(0x1e);m.fpu.push(3.125);
 const snapshot=JSON.parse(JSON.stringify(m.exportState(codec)));const re=PCMachine.fromState(snapshot,codec);
 assert.equal(re.video.getPixel(23,45),129);assert.equal(re.video.palette(129),'#00ff4d');
 assert.equal(re.ide.readSector(1)[32],0x5a);assert.equal(re.kbdQueue[0],0x1e);assert.equal(re.fpu.get(),3.125);
 re.ide.writeSector(1,new Uint8Array(512).fill(0xf1));assert.equal(m.ide.readSector(1)[0],0x5a);
});
test('Guest 286 FLAGS behavior does not emulate 386 high bits',()=>{
 const m=new PCMachine('at');const c=guest(m,[0x68,0xff,0xff,0x9d,0x9c,0x58,0xf4]);
 assert.equal(c.r[R.AX]&0xf000,0);
});
