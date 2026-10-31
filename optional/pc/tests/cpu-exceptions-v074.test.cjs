'use strict';
/* Real guest divide-fault delivery tests, no mocks, no compilation. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
function load(profile,code){
 const m=new PCMachine(profile),c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;
 for(const s of [S.DS,S.SS,S.ES])c.loadSegment(s,0);
 c.r[R.SP]=0x8000;m.ram.set(code,0x2000);return m;
}
function realHandler(m,bytes=[0xcf]){
 m.write16Physical(0,0x2300);m.write16Physical(2,0);
 m.ram.set(bytes,0x2300);
}
function pmHandler(m,bytes=[0xcf],access=0x86){
 const c=m.cpu;
 // One ring-zero executable 286 code descriptor, IDT vector 0 interrupt gate.
 m.ram.set([0xff,0xff,0,0,0,0x9a,0,0],0x408);
 m.ram.set([0,0x23,8,0,0,access,0,0],0x600);
 m.ram.set(bytes,0x2300);
 c.gdtr={base:0x400,limit:15};c.idtr={base:0x600,limit:7};
 c.msw|=1;c.loadSegment(S.CS,8);
}
for(const profile of ['xt','at']){
 test(`${profile}: unhandled DIV zero raises host CPUFault without scribbling registers/stack`,()=>{
  const m=load(profile,[0xb8,100,0,0xb3,0,0xf6,0xf3,0xf4]);
  m.cpu.step();m.cpu.step();const sp=m.cpu.r[R.SP];
  assert.throws(()=>m.cpu.step(),/Divide exception #DE: zero divisor; guest INT 00h handler not installed/);
  assert.equal(m.cpu.r[R.SP],sp);assert.equal(m.cpu.r[R.AX],100);
  assert.equal(m.cpu.lastFault,null);
 });
 test(`${profile}: real-mode INT 0 receives divide error and stacks FLAGS/CS/IP`,()=>{
  const m=load(profile,[0xb8,100,0,0xb3,0,0xf6,0xf3,0xf4]);
  realHandler(m);m.cpu.flags|=F.IF|F.TF;
  m.cpu.step();m.cpu.step();m.cpu.step();
  const c=m.cpu;
  assert.equal(c.ip,0x2300);assert.equal(c.s[S.CS],0);
  assert.equal(c.r[R.SP],0x7ffa);
  assert.equal(m.read16Physical(0x7ffa),profile==='xt'?0x2007:0x2005);
  assert.equal(m.read16Physical(0x7ffc),0);
  assert.ok(m.read16Physical(0x7ffe)&F.IF);
  assert.ok(m.read16Physical(0x7ffe)&F.TF);
  assert.equal(c.flags&(F.IF|F.TF),0);
  assert.equal(c.lastFault.vector,0);assert.equal(c.lastFault.reason,'zero divisor');
 });
 test(`${profile}: quotient overflow vectors INT 0 without modifying AX`,()=>{
  const m=load(profile,[0xb8,0xff,0xff,0xb3,1,0xf6,0xf3,0xf4]);
  realHandler(m);m.cpu.run(2);m.cpu.step();
  assert.equal(m.cpu.r[R.AX],0xffff);
  assert.equal(m.cpu.lastFault.reason,'quotient overflow');
  assert.equal(m.cpu.ip,0x2300);
 });
 test(`${profile}: real-mode handler IRET matches generation-specific #DE return IP`,()=>{
  const m=load(profile,[0xb8,100,0,0xb3,0,0xf6,0xf3,0xf4]);
  realHandler(m,[0xb3,10,0xcf]);
  m.run(40);
  assert.equal(m.cpu.halted,true);
  assert.equal(m.cpu.r[R.SP],0x8000);
  assert.equal(m.cpu.get8(3),10);
  // 8086 resumes after failed DIV; 286 retries the DIV after handler fixes BL.
  assert.equal(m.cpu.r[R.AX],profile==='xt'?100:10);
 });
}
test('286 protected mode delivers DIV fault through IDT, handler repairs register and retries',()=>{
 const m=load('at',[0xb8,100,0,0xb3,0,0xf6,0xf3,0xf4]);
 pmHandler(m,[0xb3,10,0xcf]);
 const c=m.cpu;c.flags|=F.IF;
 c.step();c.step();c.step();
 assert.equal(c.s[S.CS],8);assert.equal(c.ip,0x2300);
 assert.equal(m.read16Physical(0x7ffa),0x2005);
 assert.ok(!(c.flags&F.IF));
 c.step();c.step();
 assert.equal(c.ip,0x2005);assert.ok(c.flags&F.IF);
 c.step();assert.equal(c.r[R.AX],10);
 c.step();assert.equal(c.halted,true);assert.equal(c.r[R.SP],0x8000);
});
test('286 protected mode #DE is a hardware fault, not privilege-checked software INT',()=>{
 const m=load('at',[0xb8,100,0,0xb3,0,0xf6,0xf3]);
 pmHandler(m,[0xcf],0x86);
 m.cpu.step();m.cpu.step();
 m.cpu.step();assert.equal(m.cpu.ip,0x2300);
});
test('286 invalid #DE IDT gate fails closed without changing AX or SP',()=>{
 const m=load('at',[0xb8,100,0,0xb3,0,0xf6,0xf3]);
 pmHandler(m,[0xcf],0x85);m.cpu.run(2);
 assert.throws(()=>m.cpu.step(),/unsupported IDT gate type/);
 assert.equal(m.cpu.r[R.AX],100);assert.equal(m.cpu.r[R.SP],0x8000);
});
test('fault restart IP includes instruction prefixes on 286',()=>{
 const m=load('at',[0xb8,100,0,0xb3,0,0x3e,0xf6,0xf3,0xf4]);
 realHandler(m);m.cpu.run(2);m.cpu.step();
 assert.equal(m.read16Physical(0x7ffa),0x2005);
 assert.equal(m.cpu.lastFault.returnIP,0x2005);
});
test('repeat guest exception path remains pure JS, no WASM or runtime build',()=>{
 const fs=require('node:fs');const src=fs.readFileSync(require.resolve('../PC-Core.js'),'utf8');
 assert.doesNotMatch(src,/WebAssembly|\.wasm|emscripten|eval\s*\(/);
 assert.match(src,/divideError\(/);
});
test('286 BOUND inclusive signed range executes without changing flags',()=>{
 const m=load('at',[0xb8,0xff,0xff,0x62,0x06,0,5,0xf4]);
 m.ram.set([0xfb,0xff,5,0],0x500);m.cpu.flags|=F.CF|F.OF;
 m.run(10);
 assert.equal(m.cpu.lastFault,null);assert.equal(m.cpu.halted,true);
 assert.ok(m.cpu.flags&F.CF);assert.ok(m.cpu.flags&F.OF);
});
test('286 real-mode BOUND #BR vectors 5, handler repairs AX, IRET retries instruction',()=>{
 const m=load('at',[0xb8,6,0,0x62,0x06,0,5,0xf4]);
 m.ram.set([0xfb,0xff,5,0],0x500);
 m.write16Physical(0x14,0x2300);m.write16Physical(0x16,0);
 m.ram.set([0xb8,3,0,0xcf],0x2300);
 m.run(25);
 assert.equal(m.cpu.halted,true);assert.equal(m.cpu.r[R.AX],3);
 assert.equal(m.cpu.r[R.SP],0x8000);assert.equal(m.cpu.lastFault.name,'#BR');
 assert.equal(m.cpu.lastFault.returnIP,0x2003);
});
test('286 protected-mode BOUND uses IDT vector 5 (not real-mode IVT)',()=>{
 const m=load('at',[0xb8,6,0,0x62,0x06,0,5,0xf4]);
 m.ram.set([0xfb,0xff,5,0],0x500);
 pmHandler(m,[0xb8,3,0,0xcf]);
 m.ram.set([0,0x23,8,0,0,0x86,0,0],0x600+5*8);
 m.cpu.idtr.limit=47;
 m.run(25);
 assert.equal(m.cpu.halted,true);assert.equal(m.cpu.r[R.AX],3);
 assert.equal(m.cpu.lastFault.name,'#BR');
});
test('8086 does not silently execute 286 BOUND instruction',()=>{
 const m=load('xt',[0x62,0x06,0,5]);
 assert.throws(()=>m.cpu.step(),/BOUND is not an 8086 instruction/);
});
test('BOUND memory-form required and unhandled bounds fault fails closed',()=>{
 const a=load('at',[0x62,0xc0]);assert.throws(()=>a.cpu.step(),/BOUND requires memory/);
 const b=load('at',[0xb8,6,0,0x62,0x06,0,5]);b.ram.set([0xfb,0xff,5,0],0x500);
 b.cpu.step();assert.throws(()=>b.cpu.step(),/guest INT 05h handler not installed/);
 assert.equal(b.cpu.r[R.SP],0x8000);
});
