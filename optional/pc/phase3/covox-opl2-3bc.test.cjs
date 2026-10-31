'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');const {PCOPL2}=require('../PC-OPL2.js');const {R,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw new Error('too large');return new Uint8Array(b);}};
function machine(profile,bytes){const m=new PCMachine(profile);const c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;m.ram.set(bytes,0x2000);return m;}
function covoxCode(){return [0xba,0x78,0x03,0xb0,0xff,0xee,0xb9,0x00,0x08,0xe2,0xfe,0xb0,0x00,0xee,0xb9,0x00,0x08,0xe2,0xfe,0xf4];}
function pair(reg,value){return [0xb0,reg,0xee,0x42,0xb0,value,0xee,0x4a];}
function oplCode(){return [0xba,0x88,0x03,...pair(0x20,0x01),...pair(0x23,0x01),...pair(0x40,0x20),...pair(0x43,0x00),...pair(0x60,0xf3),...pair(0x63,0xf3),...pair(0x80,0x42),...pair(0x83,0x42),...pair(0xc0,0x00),...pair(0xa0,0x98),...pair(0xb0,0x31),0xeb,0xfe];}
for(const profile of ['xt','at']){
 test(`${profile} Covox: guest OUT DX,AL generates two real held DAC amplitudes`,()=>{
  const m=machine(profile,covoxCode());m.audio.setCapture(true);const r=m.run(10000);const pcm=m.audio.takePCM();assert.equal(r.halted,true);assert.ok(pcm.some(x=>x>0.20),`positive sample ${pcm.length}`);assert.ok(pcm.some(x=>x< -0.20),'negative DAC output');assert.equal(m.in8(0x378),0);assert.equal(m.in8(0x37a),12);
 });
 test(`${profile} Covox: disabled capture neither queues nor changes DOS memory`,()=>{
  const m=machine(profile,covoxCode()),before=m.ram.slice(0x2800,0x2900);m.run(10000);assert.equal(m.audio.samples.length,0);assert.deepEqual(m.ram.slice(0x2800,0x2900),before);
 });
 test(`${profile} OPL2: real guest x86 OUT 388/389 programs FM and yields PCM`,()=>{
  const m=machine(profile,oplCode());m.audio.setCapture(true);m.run(70000);const pcm=m.audio.takePCM();assert.equal(m.opl.reg[0xb0],0x31);assert.ok(pcm.length>150);assert.ok(pcm.some(x=>Math.abs(x)>0.0001),'FM audio nonzero');
  const n=machine(profile,oplCode());n.audio.setCapture(true);n.run(70000);assert.deepEqual(n.audio.takePCM(),pcm,'deterministic identical synthesis');
 });
 test(`${profile} OPL timer status, masked IRQ and reset`,()=>{
  const m=machine(profile,[0xf4]);m.out8(0x388,0x02);m.out8(0x389,255);m.out8(0x388,0x04);m.out8(0x389,1);
  assert.equal(m.in8(0x388)&0xe0,0);m.opl.updateTimers(0.001);assert.equal(m.in8(0x388)&0xc0,0xc0);
  m.out8(0x388,4);m.out8(0x389,0x80);assert.equal(m.in8(0x388),0);
  m.out8(0x389,0x41);m.opl.updateTimers(0.002);assert.equal(m.in8(0x388)&0x80,0,'masked timer does not raise IRQ');
 });
 test(`${profile} OPL/Covox snapshot roundtrip and validation`,()=>{
  const m=machine(profile,[0xf4]);m.out8(0x378,212);m.out8(0x388,0xa0);m.out8(0x389,0x98);
  const s=m.exportState(codec),r=PCMachine.fromState(s,codec);
  assert.equal(r.opl.reg[0xa0],0x98);assert.equal(r.audio.covoxData,212);assert.equal(r.in8(0x378),212);assert.equal(r.audio.capture,false);
  s.opl.ops[0].env=2;assert.throws(()=>PCMachine.fromState(s,codec),/Invalid OPL2/);
 });
}
test('OPL key off decays, rhythm-mode reports unsupported rather than claiming full compatibility',()=>{
 const c=new PCOPL2();c.writeAddress(0x20);c.writeData(1,0);c.writeAddress(0x23);c.writeData(1,0);
 for(const [k,v] of [[0x60,0xf3],[0x63,0xf3],[0x80,0x43],[0x83,0x43],[0xa0,0x98],[0xb0,0x31]]){c.writeAddress(k);c.writeData(v,0);}
 for(let i=0;i<5000;i++)c.sampleAt(0);assert.ok(c.ops[0].env>0);
 c.writeAddress(0xb0);c.writeData(0x11,0);for(let i=0;i<40000;i++)c.sampleAt(0);assert.equal(c.ops[0].state,0);
 c.writeAddress(0xbd);c.writeData(0x20,0);assert.equal(c.rhythmUnsupported,true);
});
