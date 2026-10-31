'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,PCProtectionFault}=require('../PC-Core.js');
function fixture(code=[0xf4]){
 const m=new PCMachine('at'),c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;
 for(const s of [S.SS,S.DS,S.ES])c.loadSegment(s,0);
 c.r[R.SP]=0x8000;m.ram.set(code,0x2000);
 c.gdtr={base:0x500,limit:0x100};c.msw=1;
 return m;
}
function desc(m,selector,base,limit,access){const a=0x500+(selector&~7);m.ram.set([limit&255,limit>>>8,base&255,base>>>8&255,base>>>16&255,access,0,0],a);}
function ldesc(m,base,limit,access){m.ram.set([limit&255,limit>>>8,base&255,base>>>8&255,base>>>16&255,access,0,0],base+8);}
function gate(m,vector,selector=8,offset=0){const a=0x900+vector*8;m.ram.set([offset&255,offset>>>8,selector&255,selector>>>8,0,0x86,0,0],a);m.cpu.idtr={base:0x900,limit:0x200};}
test('286 LLDT / SLDT and LDT segment selectors execute guest instruction bytes',()=>{
 const m=fixture([0xb8,0x10,0,0x0f,0x00,0xd0,0x0f,0x00,0xc3,0xb8,0x0c,0,0x8e,0xd8,0xf4]);
 desc(m,0x10,0x1200,0x1f,0x82);ldesc(m,0x1200,0xff,0x92);
 m.run(100);assert.equal(m.cpu.ldtr.selector,0x10);assert.equal(m.cpu.r[R.BX],0x10);
 assert.equal(m.cpu.s[S.DS],0x0c);assert.equal(m.cpu.base[S.DS],0x1200);
});
test('286 LTR / STR executes 16-bit TSS load and sets busy bit in descriptor',()=>{
 const m=fixture([0xb8,0x18,0,0x0f,0x00,0xd8,0x0f,0x00,0xcb,0xf4]);
 desc(m,0x18,0x1400,43,0x81);m.run(100);
 assert.equal(m.cpu.tr.selector,0x18);assert.equal(m.cpu.r[R.BX],0x18);
 assert.equal(m.ram[0x500+0x18+5],0x83);
});
test('286 LLDT rejects non-LDT system descriptor and loading TR twice rejects busy TSS',()=>{
 const m=fixture();desc(m,0x10,0x1200,43,0x81);
 assert.throws(()=>m.cpu.loadSystemSelector('ldtr',0x10),/requires LDT/);
 m.cpu.loadSystemSelector('tr',0x10);
 assert.throws(()=>m.cpu.loadSystemSelector('tr',0x10),/requires available 16-bit TSS/);
});
test('286 present bit and GDT/LDT selector validation identify the correct fault type',()=>{
 const m=fixture();desc(m,0x10,0x1000,0xffff,0x12);
 assert.throws(()=>m.cpu.loadSegment(S.DS,0x10),e=>e instanceof PCProtectionFault&&e.vector===11&&e.code===0x10);
 assert.throws(()=>m.cpu.loadSegment(S.SS,0x10),e=>e instanceof PCProtectionFault&&e.vector===12&&e.code===0x10);
 assert.throws(()=>m.cpu.loadSegment(S.DS,0x14),e=>e instanceof PCProtectionFault&&e.vector===13&&e.code===0x14);
});
test('286 guest #NP handler receives selector error code, fixes resume IP and IRET continues',()=>{
 const m=fixture([0xb8,0x10,0,0x8e,0xd8,0xbb,0x34,0x12,0xf4]);
 desc(m,8,0x2000,0xffff,0x9a);desc(m,0x10,0,0xffff,0x12);desc(m,0x18,0x3000,0xffff,0x9a);
 m.cpu.loadSegment(S.CS,8);m.cpu.ip=0;
 gate(m,11,0x18); // #NP
 // pop AX = error code; pop CX = saved IP; add CX,2; push CX; iret
 m.ram.set([0x58,0x59,0x81,0xc1,2,0,0x51,0xcf],0x3000);
 m.run(100);
 assert.equal(m.cpu.halted,true);assert.equal(m.cpu.lastFault.vector,11);
 assert.equal(m.cpu.lastFault.errorCode,0x10);assert.equal(m.cpu.r[R.AX],0x10);
 assert.equal(m.cpu.r[R.BX],0x1234);assert.equal(m.cpu.r[R.SP],0x8000);
});
test('286 uninstalled #GP handler fails closed with typed exception',()=>{
 const m=fixture([0xb8,0x14,0,0x8e,0xd8,0xf4]);
 assert.throws(()=>m.run(30),e=>e instanceof PCProtectionFault&&e.vector===13);
});
test('XT rejects 286 LDT and TSS opcodes rather than silently enabling 286 features',()=>{
 const m=new PCMachine('xt');m.cpu.loadSegment(S.CS,0);m.cpu.ip=0x2000;m.ram.set([0x0f,0,0xc0],0x2000);
 assert.throws(()=>m.run(2),/286 instruction on XT/);
});
test('286 ring3 CLI, STI, HLT and port IO raise #GP unless privilege permits',()=>{
 const m=fixture([0xfa]);
 m.cpu.s[S.CS]=3; // model already-entered ring3 context for privilege checks
 for(const opcode of [[0xfa],[0xfb],[0xf4],[0xec],[0xee]]){
  m.ram.set(opcode,0x2000);m.cpu.ip=0x2000;
  assert.throws(()=>m.cpu.step(),e=>e instanceof PCProtectionFault&&e.vector===13&&e.code===0);
 }
 m.cpu.flags|=0x3000; // user process with sufficient IOPL
 m.ram.set([0xfa,0xfb,0xec],0x2000);m.cpu.ip=0x2000;
 m.cpu.step();m.cpu.step();m.cpu.step();
});
test('286 privileged LGDT and LMSW are denied to ring3',()=>{
 const m=fixture([0x0f,0x01,0x16,0,7]);m.cpu.s[S.CS]=3;
 assert.throws(()=>m.cpu.step(),/privileged LGDT/);
 m.ram.set([0x0f,0x01,0xf0],0x2000);m.cpu.ip=0x2000;
 assert.throws(()=>m.cpu.step(),/privileged LMSW/);
});
test('286 POPF ring3 cannot raise IOPL or IF when IOPL is zero',()=>{
 const m=fixture([0x9d,0xf4]);m.cpu.s[S.CS]=3;m.cpu.flags=2;
 m.cpu.push(0x3202);m.cpu.step();
 assert.equal(m.cpu.flags&0x3200,0);
});
