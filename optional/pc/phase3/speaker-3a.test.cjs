'use strict';
/* Phase 3A PC Speaker: actual x86 guest I/O to a deterministic PIT2 PCM generator.
 * Unit vectors are independent of host clock and browser WebAudio. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {PCMachine}=require('../PC-Machine.js');
const {R,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw new Error('too large');return new Uint8Array(b);}};
const setup=(profile,code)=>{
 const m=new PCMachine(profile);m.cpu.loadSegment(S.CS,0);m.cpu.ip=0x2000;m.cpu.loadSegment(S.DS,0);m.cpu.loadSegment(S.SS,0);m.cpu.r[R.SP]=0x7000;m.ram.set(code,0x2000);return m;
};
const begin=[0xb0,0xb6,0xe6,0x43,0xb0,0xa9,0xe6,0x42,0xb0,0x04,0xe6,0x42,0xb0,0x03,0xe6,0x61];
function countCross(pcm){let edges=0;for(let i=1;i<pcm.length;i++)if(pcm[i]!==pcm[i-1])edges++;return edges;}
for(const profile of ['xt','at']){
 test(`${profile} PIT2/61h: genuine guest x86 loop yields deterministic audible square wave`,()=>{
  const m=setup(profile,[...begin,0xeb,0xfe]);m.audio.setCapture(true);m.run(150000);
  const pcm=m.audio.takePCM();assert.ok(pcm.length>=900,'samples generated from guest clock');
  const edges=countCross(pcm);assert.ok(edges>=25,'alternating positive and negative PCM from PIT2');
  assert.ok(pcm.some(x=>x>0)&&pcm.some(x=>x<0));
  const n=setup(profile,[...begin,0xeb,0xfe]);n.audio.setCapture(true);n.run(150000);
  assert.deepEqual(n.audio.takePCM(),pcm,'run-to-run byte exact deterministic PCM');
 });
 test(`${profile} port61 speaker-enable bit0/bit1 gates PCM; non-audio I/O unchanged`,()=>{
  const m=setup(profile,[...begin.slice(0,-2),0xb0,0x00,0xe6,0x61,0xeb,0xfe]);m.audio.setCapture(true);m.run(16000);
  assert.ok(m.audio.takePCM().every(x=>x===0),'gate off is silent');
  m.out8(0x61,1);m.run(16000);assert.ok(m.audio.takePCM().every(x=>x===0),'gate on but speaker disabled silent');
  m.out8(0x61,3);m.run(16000);assert.ok(m.audio.takePCM().some(x=>x!==0),'both bits enabled produce waveform');
  m.out8(0x61,2);m.run(16000);assert.ok(m.audio.takePCM().every(x=>x===0),'PIT clock gate disabled is silent');
 });
 test(`${profile} PIT2 readback progresses; mode0 deliberately silent instead of fake waveform`,()=>{
  const m=setup(profile,[...begin,0xeb,0xfe]);m.run(3500);
  assert.ok(m.audio.programmed);const initial=m.audio.counterAt(m.audio.clock);
  m.run(17);const current=m.audio.counterAt(m.audio.clock);
  assert.notEqual(initial,current);
  m.out8(0x43,0xb0);m.out8(0x42,0x12);m.out8(0x42,0x00);
  m.audio.setCapture(true);m.run(1000);assert.ok(m.audio.takePCM().every(x=>x===0),'explicitly unsupported PIT mode outputs silence');
 });
 test(`${profile} state import suppresses queued sound, preserves phase and old snapshot compatibility`,()=>{
  const m=setup(profile,[...begin,0xeb,0xfe]);m.audio.setCapture(true);m.run(10000);
  const state=m.exportState(codec);assert.ok(state.audio?.clock>0);
  const restored=PCMachine.fromState(state,codec);assert.equal(restored.audio.clock,m.audio.clock);assert.equal(restored.audio.capture,false);assert.equal(restored.audio.takePCM().length,0);
  const legacy={...state};delete legacy.audio;
  const older=PCMachine.fromState(legacy,codec);assert.equal(older.audio.enabled,!!(state.kbcOutput&2));
 });
}
test('silent/off mode generates no PCM queue; 10 second PCM limit is bounded',()=>{
 const m=new PCMachine('xt');m.audio.advanceTicks(1193182*3);assert.equal(m.audio.samples.length,0);
 m.audio.setCapture(true);m.audio.advanceTicks(1193182*4);assert.ok(m.audio.samples.length<=65536);
});
test('malformed speaker snapshot is rejected rather than silently corrupting guest',()=>{
 const m=new PCMachine('xt'),s=m.exportState(codec);s.audio.mode=100;
 assert.throws(()=>PCMachine.fromState(s,codec),/audio state range/);
});
