'use strict';
// Replacement for outdated TODOs: assert actual guest port, PCM, DMA/IRQ,
// and cross-device snapshot invariants. Native Node test runner only.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('oversized');return new Uint8Array(b);}};
function guest(profile,bytes){const m=new PCMachine(profile);const c=m.cpu;c.loadSegment(S.CS,0);c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.ip=0x2000;c.r[R.SP]=0x7000;m.ram.set(bytes,0x2000);return m;}
for(const profile of ['xt','at']){
 test(`${profile}: Covox gate — guest OUT 378h, no fake sound before first write`,()=>{
  const m=guest(profile,[0xba,0x78,0x03,0xb0,0xff,0xee,0xeb,0xfe]);
  m.audio.setCapture(true);m.audio.advanceTicks(500);assert.ok(m.audio.takePCM().every(v=>v===0));
  m.run(40000);const pcm=m.audio.takePCM();assert.ok(pcm.length>100);assert.ok(pcm.some(v=>v>0.20));
 });
 test(`${profile}: OPL2 gate — real registers, timer and deterministic FM`,()=>{
  const m=guest(profile,[0xba,0x88,0x03,0xb0,0x02,0xee,0x42,0xb0,0xff,0xee,0x4a,0xb0,0x04,0xee,0x42,0xb0,1,0xee,0xeb,0xfe]);
  m.run(400);assert.equal(m.opl.t1,255);m.opl.updateTimers(0.002);
  assert.equal(m.in8(0x388)&0xc0,0xc0);
  const a=m.opl.exportState(),b=new (require('../PC-OPL2.js').PCOPL2)();b.restoreState(a);
  assert.equal(b.readStatus(0.002),m.in8(0x388));
 });
 test(`${profile}: SB2 gate — DSP reset, real DMA1 RAM, IRQ acknowledgment`,()=>{
  const m=guest(profile,[0xf4]);m.ram[0x5000]=0xff;
  m.out8(0x226,1);m.out8(0x226,0);assert.equal(m.in8(0x22a),0xaa);
  m.dma.page[1]=0;m.dma.addr[1]=0x5000;m.dma.count[1]=0;m.dma.mode[1]=0x49;m.dma.mask&=~2;
  m.out8(0x22c,0xd1);m.out8(0x22c,0x14);m.out8(0x22c,0);m.out8(0x22c,0);
  m.sb2.advanceTo(m.sb2.nextTick+1);assert.equal(m.sb2.held,255);
  assert.equal(m.dma.mask&2,2);assert.equal(m.pic.irr&(1<<5),1<<5);
  m.in8(0x22e);assert.equal(m.sb2.irqRaised,false);
 });
 test(`${profile}: full reset/snapshot keeps Covox/OPL/SB2 state but never queues stale PCM`,()=>{
  const m=guest(profile,[0xf4]);m.audio.setCapture(true);
  m.out8(0x378,200);m.out8(0x388,0xa0);m.out8(0x389,0x98);
  m.out8(0x226,1);m.out8(0x226,0);m.out8(0x22c,0xe1);
  m.audio.advanceTicks(2500);assert.ok(m.audio.samples.length>0);
  const data=JSON.parse(JSON.stringify(m.exportState(codec)));
  const r=PCMachine.fromState(data,codec);
  assert.equal(r.audio.capture,false);assert.equal(r.audio.samples.length,0);
  assert.equal(r.audio.covoxData,200);assert.equal(r.opl.reg[0xa0],0x98);
  assert.equal(r.in8(0x22a),0xaa);assert.equal(r.in8(0x22a),2);
  r.audio.setCapture(true);r.audio.advanceTicks(200);assert.ok(r.audio.takePCM().length>0);
 });
}
