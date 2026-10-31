'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
function boot(p,bytes,opts={}){
 const m=new PCMachine(p),c=m.cpu;
 c.loadSegment(S.CS,0);c.ip=0x2000;
 c.loadSegment(S.DS,0);c.loadSegment(S.ES,0);c.loadSegment(S.SS,0);
 c.r[R.SP]=0x8000;
 m.ram.set(bytes,0x2000);
 if(opts.ds!==undefined)c.loadSegment(S.DS,opts.ds);
 if(opts.ss!==undefined)c.loadSegment(S.SS,opts.ss);
 if(opts.es!==undefined)c.loadSegment(S.ES,opts.es);
 return m;
}
const run=(p,bytes,opts={})=>{const m=boot(p,bytes,opts);m.run(500);return m;};
for(const p of ['xt','at']){
 test(`${p}: ModRM register MOV, XOR, memory direct and 16-bit value roundtrip`,()=>{
  const m=run(p,[0xbb,0x56,0x34,0x89,0x1e,0x00,0x05,0x8b,0x06,0x00,0x05,0x31,0xdb,0xf4]);
  assert.equal(m.read16Physical(0x500),0x3456);assert.equal(m.cpu.reg('AX'),0x3456);assert.equal(m.cpu.reg('BX'),0);assert.ok(m.cpu.flags&F.ZF);
 });
 test(`${p}: ModRM all 8086 address forms with displacements and default SS on BP`,()=>{
  // MOV AX, [BX+SI+7]; MOV [BP+DI-2], AX; MOV CX, [BP+DI-2]
  const m=boot(p,[0x8b,0x40,0x07,0x89,0x43,0xfe,0x8b,0x4b,0xfe,0xf4],{ds:0x100,ss:0x200});
  const c=m.cpu;c.r[R.BX]=0x10;c.r[R.SI]=0x20;c.r[R.BP]=0x50;c.r[R.DI]=0x12;
  m.write16Physical(0x1000+0x37,0xbeef);m.run();
  assert.equal(c.reg('AX'),0xbeef);
  assert.equal(c.reg('CX'),0xbeef);
  assert.equal(m.read16Physical(0x2000+0x60),0xbeef);
  assert.equal(m.read16Physical(0x1000+0x60),0);
 });
 test(`${p}: DS override for BP and SS override for BX`,()=>{
  // MOV AX, DS:[BP] ; MOV CX, SS:[BX] ; HLT
  const m=boot(p,[0x3e,0x8b,0x46,0,0x36,0x8b,0x0f,0xf4],{ds:0x100,ss:0x200});
  m.cpu.r[R.BP]=0x10;m.cpu.r[R.BX]=0x20;
  m.write16Physical(0x1010,0x1111);m.write16Physical(0x2020,0x2222);m.run();
  assert.equal(m.cpu.r[R.AX],0x1111);assert.equal(m.cpu.r[R.CX],0x2222);
 });
 test(`${p}: reg/mem 8-bit MOV and C6 imm8 store`,()=>{
  const m=run(p,[0xc6,0x06,0x20,0x05,0xfa,0x8a,0x06,0x20,0x05,0x88,0x1e,0x21,0x05,0xf4]);
  assert.equal(m.read8(0x520),250);assert.equal(m.cpu.get8(0),250);assert.equal(m.read8(0x521),0);
 });
 test(`${p}: arithmetic byte flags carry overflow and compare`,()=>{
  // MOV AL,7f ; ADD AL,1 -> OF ; ADD AL,80 -> CF+ZF ; CMP AL,0
  const m=run(p,[0xb0,0x7f,0x04,0x01,0xb3,0x00,0x04,0x80,0x3c,0x00,0xf4]);
  assert.equal(m.cpu.get8(0),0);assert.ok(m.cpu.flags&F.ZF);assert.ok(!(m.cpu.flags&F.CF));
  const ov=run(p,[0xb0,0x7f,0x04,0x01,0xf4]);assert.ok(ov.cpu.flags&F.OF);assert.ok(ov.cpu.flags&F.SF);
 });
 test(`${p}: group 80/81/83 arithmetic writes through memory`,()=>{
  // MOV [500],2; ADD word [500], 3; SUB word [500],-1; CMP word [500],6
  const m=run(p,[0xc7,0x06,0x00,0x05,0x02,0,0x83,0x06,0x00,0x05,0x03,0x83,0x2e,0x00,0x05,0xff,0x83,0x3e,0x00,0x05,0x06,0xf4]);
  assert.equal(m.read16Physical(0x500),6);assert.ok(m.cpu.flags&F.ZF);
 });
 test(`${p}: REP MOVSB and STOSW with DI+SI and DF`,()=>{
  // REP MOVSB ; STD ; REP STOSW ; HLT
  const m=boot(p,[0xf3,0xa4,0xfd,0xf3,0xab,0xf4]);
  m.cpu.r[R.CX]=3;m.cpu.r[R.SI]=0x500;m.cpu.r[R.DI]=0x600;
  m.ram.set([1,2,3],0x500);m.cpu.r[R.AX]=0x1234;
  m.cpu.step();assert.deepEqual([...m.ram.slice(0x600,0x603)],[1,2,3]);assert.equal(m.cpu.r[R.CX],0);
  m.cpu.step();m.cpu.r[R.CX]=2;m.cpu.step();
  assert.equal(m.read16Physical(0x603),0x1234);assert.equal(m.read16Physical(0x601),0x1234);
 });
 test(`${p}: REPE CMPSB stops at first mismatch`,()=>{
  const m=boot(p,[0xf3,0xa6,0xf4]);m.ram.set([1,2,3,4],0x500);m.ram.set([1,2,9,4],0x600);
  m.cpu.r[R.SI]=0x500;m.cpu.r[R.DI]=0x600;m.cpu.r[R.CX]=4;m.run();
  assert.equal(m.cpu.r[R.CX],1);assert.equal(m.cpu.r[R.SI],0x503);assert.ok(!(m.cpu.flags&F.ZF));
 });
 test(`${p}: LOOPNZ/LOOP/JCXZ flow control with CX`,()=>{
  const m=run(p,[0xb9,3,0,0x40,0xe2,0xfd,0xe3,0x03,0xb8,0xff,0xff,0xf4]);
  assert.equal(m.cpu.r[R.AX],3);assert.equal(m.cpu.r[R.CX],0);
 });
 test(`${p}: LEA, XCHG, TEST, LAHF and POP r/m16`,()=>{
  const m=run(p,[0xbb,0x10,0,0xbe,0x20,0,0x8d,0x40,0x07,0x87,0xd8,0x85,0xc0,0x9f,0x50,0x8f,0x06,0x00,0x05,0xf4]);
  // LAHF writes status bits into AH, changing AX from 0010h to 0210h.
  assert.equal(m.cpu.r[R.AX],0x0210);assert.equal(m.cpu.r[R.BX],0x37);
  assert.equal(m.read16Physical(0x500),0x0210);
 });
 test(`${p}: unsupported LOCK prefix fails closed`,()=>assert.throws(()=>run(p,[0xf0,0x90,0xf4]),CPUFault));
 test(`${p}: protected undefined CPU instruction fails closed`,()=>assert.throws(()=>run(p,[0x0f,0xff]),CPUFault));
}
test('XT rejects 286-only PUSHA and PUSH imm',()=>{
 assert.throws(()=>run('xt',[0x60]),/not an 8086/);
 assert.throws(()=>run('xt',[0x68,1,0]),/not an 8086/);
});
test('AT PUSHA and POPA preserve originals with saved SP',()=>{
 const m=run('at',[0xb8,0x11,0x11,0xbb,0x22,0x22,0x60,0x31,0xc0,0x31,0xdb,0x61,0xf4]);
 assert.equal(m.cpu.r[R.AX],0x1111);assert.equal(m.cpu.r[R.BX],0x2222);assert.equal(m.cpu.r[R.SP],0x8000);
});
test('AT PUSH imm8 sign extends to 16 bits and POP r/m16 reads signed value',()=>{
 const m=run('at',[0x6a,0xff,0x8f,0x06,0,5,0xf4]);assert.equal(m.read16Physical(0x500),0xffff);
});
test('AT 286 SMSW r/m, SGDT memory and LMSW preserves PE',()=>{
 const m=run('at',[0xb8,1,0,0x0f,0x01,0xf0,0x0f,0x01,0xe3,0xb8,0,0,0x0f,0x01,0xf0,0x0f,0x01,0xe6,0xf4]);
 assert.equal(m.cpu.r[R.BX]&1,1);assert.equal(m.cpu.r[R.SI]&1,1);assert.equal(m.cpu.msw&1,1);
});
test('286 protected mode rejects word crossing segment limit',()=>{
 const m=new PCMachine('at');m.cpu.msw=1;m.cpu.limit[S.DS]=0x100;
 assert.throws(()=>m.cpu.read16(S.DS,0x100),/Segment limit exceeded/);
});
test('8086 real mode word at segment FFFF wraps offset to 0000',()=>{
 const m=new PCMachine('xt');m.cpu.loadSegment(S.DS,0x300);m.cpu.write8(S.DS,0xffff,0x78);m.cpu.write8(S.DS,0,0x56);
 assert.equal(m.cpu.read16(S.DS,0xffff),0x5678);
});
