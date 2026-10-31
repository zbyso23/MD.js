'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S}=require('../PC-Core.js');
function machine(profile,code){const m=new PCMachine(profile);const c=m.cpu;
 c.loadSegment(S.CS,0);c.loadSegment(S.SS,0);c.ip=0x100;c.r[R.SP]=0x8000;m.ram.set(code,0x100);return m;}
test('real 80286 PUSHF masks FLAGS high nibble, restoring DEBUG v2.50 generation detection',()=>{
 const m=machine('at',[0x9c,0x58,0xf4]);m.cpu.flags=0xf202;m.run(10);
 assert.equal(m.cpu.r[R.AX]&0xf000,0,'286 real mode FLAGS bits 12..15 read back clear');
});
test('286 real-mode POPF cannot set FLAGS high nibble, and IRET restores masked flags',()=>{
 const m=machine('at',[0x68,0xff,0xff,0x9d,0x9c,0x58,0xf4]);m.run(20);
 assert.equal(m.cpu.r[R.AX]&0xf000,0);
 assert.equal(m.cpu.flags&0xf000,0);
});
test('286 protected-mode PUSHF retains IOPL (real-mode masking must not leak)',()=>{
 const m=machine('at',[0x9c,0x58,0xf4]);m.cpu.msw=1;m.cpu.flags=0x3202;
 m.cpu.step();assert.equal(m.read16Physical(0x7ffe)&0x3000,0x3000);
});
