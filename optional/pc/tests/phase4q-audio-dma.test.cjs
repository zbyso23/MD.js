'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {PCOPL2}=require('../PC-OPL2.js');
const rand=(()=>{let s=0xa11d4a17;return ()=>s=(Math.imul(s,1664525)+1013904223)>>>0;})();
test('SB2 randomized 8-bit DMA block playback on XT/AT: exact sample tail, IRQ5, guest RAM unchanged',()=>{
 for(const profile of ['xt','at'])for(let round=0;round<48;round++){
  const m=new PCMachine(profile),size=1+(rand()%256),base=0x4800+round*256;
  const reference=new Uint8Array(size);for(let i=0;i<size;i++)reference[i]=rand()&255;
  m.ram.set(reference,base);m.dma.addr[1]=base;m.dma.baseAddr[1]=base;m.dma.page[1]=0;
  m.dma.count[1]=size-1;m.dma.baseCount[1]=size-1;m.dma.mode[1]=0x49;m.dma.mask&=~2;
  m.out8(0x226,1);m.out8(0x226,0);assert.equal(m.in8(0x22a),0xaa);
  m.out8(0x22c,0xd1);m.out8(0x22c,0x14);m.out8(0x22c,(size-1)&255);m.out8(0x22c,(size-1)>>8);
  const initial=m.sb2.nextTick,rate=m.sb2.rate;
  m.sb2.advanceTo(initial+(size-1)*1193182/rate+1);
  assert.equal(m.sb2.held,reference.at(-1),`${profile} round ${round}`);
  assert.equal(m.sb2.playing,false);assert.equal(m.dma.mask&2,2);
  assert.equal(m.pic.irr&(1<<5),1<<5);
  assert.deepEqual(m.ram.slice(base,base+size),reference,'DMA must read guest RAM without mutating sample');
  m.in8(0x22e);assert.equal(m.sb2.irqRaised,false);
 }
});
test('OPL2 seeded register writes and snapshots reproduce deterministic 256-frame samples',()=>{
 const a=new PCOPL2(),b=new PCOPL2();
 for(let i=0;i<160;i++){a.writeAddress(rand()%256);a.writeData(rand()%256,i/1000);}
 b.restoreState(a.exportState());
 for(let i=0;i<256;i++)assert.equal(a.sampleAt(i/22050),b.sampleAt(i/22050));
 const before=b.exportState();const broken={...before,ops:before.ops.map(o=>({...o}))};broken.ops[3].env=-1;
 assert.throws(()=>b.restoreState(broken));assert.deepEqual(b.exportState(),a.exportState());
});
