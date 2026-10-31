'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
function load(profile,code){
 const m=new PCMachine(profile),c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;
 c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.loadSegment(S.ES,0);
 c.r[R.SP]=0x8000;m.ram.set(code,0x2000);return m;
}
function run(p,code){const m=load(p,code);m.run(1000);return m;}
for(const profile of ['xt','at']){
 test(`${profile}: NOT word and byte do not modify flags`,()=>{
  const m=run(profile,[0xb8,0x34,0x12,0xf9,0xf7,0xd0,0xf6,0xd0,0xf4]);
  assert.equal(m.cpu.r[R.AX],0xed34);assert.ok(m.cpu.flags&F.CF);
 });
 test(`${profile}: NEG byte detects signed overflow and carry`,()=>{
  const m=run(profile,[0xb0,0x80,0xf6,0xd8,0xf4]);
  assert.equal(m.cpu.get8(0),128);assert.ok(m.cpu.flags&F.OF);assert.ok(m.cpu.flags&F.CF);
 });
 test(`${profile}: TEST imm8/imm16 leaves register unchanged`,()=>{
  const m=run(profile,[0xb8,0x12,0x34,0xf7,0xc0,0xff,0,0xf6,0xc4,0xff,0xf4]);
  assert.equal(m.cpu.r[R.AX],0x3412);assert.ok(!(m.cpu.flags&F.ZF));
 });
 test(`${profile}: unsigned MUL byte AL -> AX`,()=>{
  const m=run(profile,[0xb0,0x20,0xb3,0x10,0xf6,0xe3,0xf4]);
  assert.equal(m.cpu.r[R.AX],0x200);assert.ok(m.cpu.flags&F.CF);assert.ok(m.cpu.flags&F.OF);
 });
 test(`${profile}: unsigned MUL word AX -> DX:AX`,()=>{
  const m=run(profile,[0xb8,0,0x80,0xbb,3,0,0xf7,0xe3,0xf4]);
  assert.equal(m.cpu.r[R.AX],0x8000);assert.equal(m.cpu.r[R.DX],1);assert.ok(m.cpu.flags&F.CF);
 });
 test(`${profile}: signed IMUL byte signed value and overflow`,()=>{
  const m=run(profile,[0xb0,0xfe,0xb3,2,0xf6,0xeb,0xf4]);
  assert.equal(m.cpu.r[R.AX],0xfffc);assert.ok(!(m.cpu.flags&F.CF));
 });
 test(`${profile}: unsigned DIV byte 0x0123 / 10 produces AL quotient, AH remainder`,()=>{
  const m=run(profile,[0xb8,0x23,1,0xb3,10,0xf6,0xf3,0xf4]);
  assert.equal(m.cpu.get8(0),29);assert.equal(m.cpu.get8(4),1);
 });
 test(`${profile}: signed IDIV byte -101 / 10 rounds toward zero`,()=>{
  const m=run(profile,[0xb8,0x9b,0xff,0xb3,10,0xf6,0xfb,0xf4]);
  assert.equal(m.cpu.get8(0),0xf6);assert.equal(m.cpu.get8(4),0xff);
 });
 test(`${profile}: unsigned DIV word 0x10000 / 256`,()=>{
  const m=run(profile,[0xba,1,0,0xb8,0,0,0xbb,0,1,0xf7,0xf3,0xf4]);
  assert.equal(m.cpu.r[R.AX],256);assert.equal(m.cpu.r[R.DX],0);
 });
 test(`${profile}: divide by zero and quotient overflow fail closed`,()=>{
  assert.throws(()=>run(profile,[0xb8,1,0,0xb3,0,0xf6,0xf3]),/Divide exception #DE/);
  assert.throws(()=>run(profile,[0xb8,0xff,0xff,0xb3,1,0xf6,0xf3]),/quotient overflow/);
 });
 test(`${profile}: shift SHL/SAR/SHR set carry and zero/parity/overflow`,()=>{
  const a=run(profile,[0xb0,0x80,0xd0,0xe0,0xf4]);
  assert.equal(a.cpu.get8(0),0);assert.ok(a.cpu.flags&F.CF);assert.ok(a.cpu.flags&F.ZF);assert.ok(a.cpu.flags&F.OF);
  const b=run(profile,[0xb0,0x81,0xd0,0xf8,0xf4]);
  assert.equal(b.cpu.get8(0),0xc0);assert.ok(b.cpu.flags&F.CF);assert.ok(!(b.cpu.flags&F.OF));
  const c=run(profile,[0xb0,0x81,0xd0,0xe8,0xf4]);
  assert.equal(c.cpu.get8(0),0x40);assert.ok(c.cpu.flags&F.CF);assert.ok(c.cpu.flags&F.OF);
 });
 test(`${profile}: ROL/ROR carry with flags unaffected except OF`,()=>{
  const a=run(profile,[0xb0,0x81,0xd0,0xc0,0xf4]);
  assert.equal(a.cpu.get8(0),3);assert.ok(a.cpu.flags&F.CF);assert.ok(a.cpu.flags&F.OF);
  const b=run(profile,[0xb0,1,0xd0,0xc8,0xf4]);
  assert.equal(b.cpu.get8(0),0x80);assert.ok(b.cpu.flags&F.CF);assert.ok(b.cpu.flags&F.OF);
 });
 test(`${profile}: rotate through carry and zero-count preserve flags`,()=>{
  const a=run(profile,[0xb0,0x80,0xf9,0xd0,0xd0,0xf4]);
  assert.equal(a.cpu.get8(0),1);assert.ok(a.cpu.flags&F.CF);
  const b=run(profile,[0xb0,0x80,0xf9,0xd0,0xd8,0xf4]);
  assert.equal(b.cpu.get8(0),0xc0);assert.ok(!(b.cpu.flags&F.CF));
  const c=run(profile,[0xb0,0x42,0xf9,0xb1,0,0xd2,0xe0,0xf4]);
  assert.equal(c.cpu.get8(0),0x42);assert.ok(c.cpu.flags&F.CF);
 });
 test(`${profile}: FE/FF INC/DEC memory preserves CF`,()=>{
  const m=run(profile,[0xf9,0xc6,0x06,0,5,10,0xfe,0x06,0,5,0xfe,0x0e,0,5,0xff,0x06,0,5,0xf4]);
  assert.equal(m.read8(0x500),11);assert.equal(m.read8(0x501),0);assert.ok(m.cpu.flags&F.CF);
 });
 test(`${profile}: FF near indirect CALL and RET resume at caller`,()=>{
  // MOV BX,2009h ; CALL BX ; HLT ; (padding) INC AX ; RET
  const m=run(profile,[0xbb,9,0x20,0xff,0xd3,0xf4,0x90,0x90,0x90,0x40,0xc3]);
  assert.equal(m.cpu.r[R.AX],1);assert.equal(m.cpu.r[R.SP],0x8000);
 });
 test(`${profile}: FF far JMP from m16:16`,()=>{
  const m=load(profile,[0xff,0x2e,0,5,0xf4]);
  m.write16Physical(0x500,0x2100);m.write16Physical(0x502,0);m.ram.set([0xb8,0x34,0x12,0xf4],0x2100);
  m.run(50);assert.equal(m.cpu.r[R.AX],0x1234);
 });
 test(`${profile}: reserved FE and F6 selectors raise CPUFault`,()=>{
  assert.throws(()=>run(profile,[0xfe,0xd0]),CPUFault); // FE /2
  assert.throws(()=>run(profile,[0xf6,0xc8]),CPUFault); // F6 /1
 });
}
test('8086 PUSH SP pushes decremented SP, 286 pushes prior SP',()=>{
 for(const p of ['xt','at']){
  const m=run(p,[0x54,0x5b,0xf4]);
  assert.equal(m.cpu.r[R.BX],p==='xt'?0x7ffe:0x8000);
 }
});
test('8086 CL shift count is unmasked; 286 masks count to five bits',()=>{
 for(const p of ['xt','at']){
  const m=run(p,[0xb0,1,0xb1,0x20,0xd2,0xe0,0xf4]);
  assert.equal(m.cpu.get8(0),p==='xt'?0:1);
 }
});
test('286 C0/C1 immediate shifts work; 8086 rejects them',()=>{
 const m=run('at',[0xb8,1,0,0xc1,0xe0,4,0xf4]);assert.equal(m.cpu.r[R.AX],16);
 assert.throws(()=>run('xt',[0xc1,0xe0,4]),/8086/);
});
test('286 ENTER and LEAVE form and unwind a stack frame',()=>{
 const m=run('at',[0xbd,0x34,0x12,0xc8,8,0,0,0xc9,0xf4]);
 assert.equal(m.cpu.r[R.BP],0x1234);assert.equal(m.cpu.r[R.SP],0x8000);
 assert.equal(m.read16Physical(0x7ffe),0x1234);
 assert.throws(()=>run('xt',[0xc8,8,0,0]),/8086/);
});
test('pure browser JavaScript CPU path has no compilation or WASM requirement',()=>{
 const fs=require('node:fs'),p=require('node:path');
 const pc=p.resolve(__dirname,'..');
 const html=fs.readFileSync(p.join(pc,'index.html'),'utf8');
 const script=fs.readFileSync(p.join(pc,'PC-Core.js'),'utf8');
 assert.match(html,/PC-Core\.js/);assert.doesNotMatch(html,/\.wasm\b|WebAssembly|emscripten/i);
 assert.doesNotMatch(script,/WebAssembly|emscripten|eval\s*\(/i);
});
function protectedGate(kind=0x86){
 const m=load('at',[0xcd,0x30,0xf4]),c=m.cpu;
 // GDT entry #1: base 0, limit FFFFh, present ring-0 executable/readable code.
 m.ram.set([0xff,0xff,0,0,0,0x9a,0,0],0x408);
 c.gdtr={base:0x400,limit:0x0f};c.idtr={base:0x600,limit:0x1ff};
 // IDT vector 30h: offset 2100h, CS selector 8, access kind.
 m.ram.set([0,0x21,8,0,0,kind,0,0],0x600+0x30*8);
 m.ram[0x2100]=0xcf;c.msw|=1;c.loadSegment(S.CS,8);c.flags|=F.IF;
 return m;
}
test('286 protected-mode software INT uses 8-byte IDT gate, IRET returns',()=>{
 const m=protectedGate(),c=m.cpu;
 c.step();assert.equal(c.ip,0x2100);assert.equal(c.s[S.CS],8);assert.equal(c.r[R.SP],0x7ffa);
 assert.ok(!(c.flags&F.IF));
 c.step();assert.equal(c.ip,0x2002);assert.ok(c.flags&F.IF);
 c.step();assert.ok(c.halted);
});
test('286 protected-mode trap gate preserves IF',()=>{
 const m=protectedGate(0x87);m.cpu.step();assert.ok(m.cpu.flags&F.IF);
});
test('286 IDT limit and invalid gate types fail closed',()=>{
 const a=protectedGate();a.cpu.idtr.limit=0x17f;
 assert.throws(()=>a.cpu.step(),/outside IDTR limit/);
 const b=protectedGate(0x85);assert.throws(()=>b.cpu.step(),/unsupported IDT gate/);
 const c=protectedGate(0x06);assert.throws(()=>c.cpu.step(),/not present/);
});
