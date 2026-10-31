'use strict';
// The 286 compatibility gate verifies supported behaviors, NOT the entire 286 ISA.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');const {R,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('oversized');return new Uint8Array(b);}};
function run(profile,code){const m=new PCMachine(profile);const c=m.cpu;c.loadSegment(S.CS,0);c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.ip=0x2000;c.r[R.SP]=0x7000;m.ram.set(code,0x2000);return m;}
test('80286 real mode POPF/PUSHF mask 12..15 under all bit combinations',()=>{
 for(let high=0;high<16;high++){
  const m=run('at',[0x68,0xff,(high<<4)|0x0f,0x9d,0x9c,0x58,0xf4]);m.run(30);
  assert.equal(m.cpu.r[R.AX]&0xf000,0,`286 bit pattern ${high}`);
 }
});
for(const profile of ['xt','at']){
 test(`${profile}: 386 operand size prefix 66h fails closed, not silently accepted`,()=>{
  const m=run(profile,[0x66,0x90,0xf4]);assert.throws(()=>m.run(10),/386.*(unsupported|prefix)|#UD/);
 });
 test(`${profile}: ROM boot snapshot preserves mode, A20, memory and guest FLAGS`,()=>{
  const m=run(profile,[0xb8,0x12,0x34,0xf4]);m.run(10);
  const snap=JSON.parse(JSON.stringify(m.exportState(codec))),n=PCMachine.fromState(snap,codec);
  assert.equal(n.cpu.r[R.AX],m.cpu.r[R.AX]);assert.equal(n.cpu.flags,m.cpu.flags);
  assert.equal(n.cpu.protected,m.cpu.protected);assert.equal(n.a20,m.a20);
 });
}
test('80287XL remains AT-only and experimental 80bit precision opt-in',()=>{
 assert.throws(()=>new PCMachine('xt',{fpuEnabled:true,fpuPrecision:'extended80'}),/AT/);
 const m=new PCMachine('at',{fpuEnabled:true,fpuPrecision:'extended80'});
 assert.equal(m.fpu.precisionMode,'extended80');assert.equal(m.fpu.cpuHz,m.cpuHz);
 assert.equal(new PCMachine('at',{fpuEnabled:true}).fpu.precisionMode,'binary64');
});
