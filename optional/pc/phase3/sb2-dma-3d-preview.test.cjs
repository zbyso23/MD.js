'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');const {R,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw new Error('too large');return new Uint8Array(b);}};
const setup=(profile,program)=>{const m=new PCMachine(profile);const c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;m.ram.set(program,0x2000);return m;};
function dmaGuestSetup(addr,count,auto){
 const outs=(port,vals)=>vals.flatMap(v=>[0xb0,v,0xe6,port]);
 return [0xb0,0,0xe6,0x0c,...outs(2,[addr&255,addr>>>8]),0xb0,0,0xe6,0x0c,...outs(3,[(count-1)&255,((count-1)>>>8)&255]),
  0xba,0x83,0x00,0xb0,0,0xee, // page 1 = 0
  0xb0,auto?0x59:0x49,0xe6,0x0b,0xb0,1,0xe6,0x0a];
}
function dspGuestSetup(n,auto=false){
 const cmds=auto?[0xd1,0x40,156,0x48,(n-1)&255,((n-1)>>>8)&255,0x1c]:[0xd1,0x40,156,0x14,(n-1)&255,((n-1)>>>8)&255];
 return [0xba,0x2c,0x02,...cmds.flatMap(v=>[0xb0,v,0xee]),0xeb,0xfe];
}
for(const profile of ['xt','at']){
 test(`${profile} SB2 DSP reset handshake and version 2.01 through guest x86 OUT`,()=>{
  const m=setup(profile,[0xba,0x26,0x02,0xb0,1,0xee,0xb0,0,0xee,0xba,0x2c,0x02,0xb0,0xe1,0xee,0xf4]);const r=m.run(100);
  assert.equal(r.halted,true);assert.equal(m.in8(0x22a),0xaa);assert.equal(m.in8(0x22a),2);assert.equal(m.in8(0x22a),1);assert.equal(m.in8(0x22a),255);
 });
 test(`${profile} guest x86 config DMA1 + SB2 commands -> guest RAM PCM -> IRQ5`,()=>{
  const addr=0x5000,bytes=[0,255,20,235,128,240,12,128],m=setup(profile,[...dmaGuestSetup(addr,bytes.length,false),...dspGuestSetup(bytes.length)]);
  m.ram.set(bytes,addr);const before=Uint8Array.from(bytes);m.audio.setCapture(true);m.run(40000);
  const pcm=m.audio.takePCM();assert.ok(pcm.some(x=>x>=0.18),'unsigned DMA PCM high values');assert.ok(pcm.some(x=>x<=-0.18),'unsigned DMA PCM low values');
  assert.ok(m.pic.irr&(1<<5),'terminal count interrupt');assert.ok(m.dma.status&(1<<1));assert.ok(m.dma.mask&2,'single-cycle masks DMA1 on terminal count');
  assert.deepEqual(m.ram.slice(addr,addr+bytes.length),before,'playback never writes to guest memory');assert.equal(m.sb2.playing,false);
  assert.equal(m.in8(0x22e),0,'DSP 8bit IRQ ack');assert.equal(m.sb2.irqRaised,false);
 });
 test(`${profile} DMA1 64KiB crossing wraps OFFSET while holding PAGE`,()=>{
  const m=setup(profile,[0xf4]);m.dma.mask&=~2;m.dma.mode[1]=0x49;m.dma.addr[1]=0xffff;m.dma.count[1]=2;m.dma.page[1]=0;
  m.ram[0xffff]=42;m.ram[0]=99;
  assert.equal(m.sb2.dmaRead(),42);assert.equal(m.sb2.dmaRead(),99);assert.equal(m.dma.addr[1],1);
 });
 test(`${profile} auto-init repeats DMA block and stops after exit command at boundary`,()=>{
  const m=setup(profile,[...dmaGuestSetup(0x5000,4,true),...dspGuestSetup(4,true)]);
  m.ram.set([0,255,64,192],0x5000);m.audio.setCapture(true);m.run(5000);
  assert.ok(m.pic.irr&32,'auto-init generated DMA block IRQ');assert.equal(m.dma.mask&2,0,'channel remains enabled');assert.equal(m.sb2.auto,true);
  m.out8(0x22c,0xda);m.run(5000);assert.equal(m.sb2.playing,false,'exit auto init at next boundary');
 });
 test(`${profile} DMA wrong direction or mask does NOT invent PCM or IRQ`,()=>{
  const m=setup(profile,[...dspGuestSetup(4)]);m.ram.set([255,0,255,0],0x5000);m.audio.setCapture(true);m.run(15000);
  assert.equal(m.pic.irr&32,0);assert.equal(m.dma.addr[1],0);assert.equal(m.sb2.held,128);
  m.out8(0x0b,0x45);m.out8(0x0a,1);m.run(2000);assert.equal(m.pic.irr&32,0);
 });
 test(`${profile} SB2 export/restore no stale PCM buffers`,()=>{
  const m=setup(profile,[0xf4]);m.out8(0x226,1);m.out8(0x226,0);m.out8(0x22c,0xe1);const state=m.exportState(codec);
  const n=PCMachine.fromState(state,codec);assert.deepEqual([n.in8(0x22a),n.in8(0x22a),n.in8(0x22a)],[170,2,1]);assert.equal(n.audio.samples.length,0);
  state.sb2.held=999;assert.throws(()=>PCMachine.fromState(state,codec),/Invalid SB2/);
 });
}
